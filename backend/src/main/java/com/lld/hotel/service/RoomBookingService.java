package com.lld.hotel.service;

import com.lld.hotel.exception.BookingNotFoundException;
import com.lld.hotel.exception.InvalidDateRangeException;
import com.lld.hotel.exception.InvalidReservationTransitionException;
import com.lld.hotel.exception.RoomNotFoundException;
import com.lld.hotel.exception.RoomUnavailableException;
import com.lld.hotel.model.Booking;
import com.lld.hotel.model.ReservationStatus;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.RoomStatus;
import com.lld.hotel.repository.HotelRepository;
import com.lld.hotel.strategy.CancellationRefundStrategy;
import com.lld.hotel.strategy.CancellationRefundStrategyFactory;
import com.lld.hotel.strategy.RefundResult;
import com.lld.hotel.strategy.TariffStrategy;
import com.lld.hotel.strategy.TariffStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Serialises every mutation of a room's booking calendar so two guests can never be confirmed
 * into the same room for overlapping dates.
 *
 * <p>The previous implementation was a textbook check-then-act race, and worse: it modelled
 * "is this room bookable" as a single {@code RoomStatus.BOOKED} flag, so the very first booking
 * for ANY future date blocked every other date range on that room, forever, until one checkout.
 * Two guests requesting genuinely overlapping dates could also both read {@code AVAILABLE}
 * before either wrote {@code BOOKED}:
 *
 * <pre>
 *   if (room.getStatus() != AVAILABLE) throw ...;   // check
 *   room.setStatus(BOOKED);                          // act — nothing held the room in between
 * </pre>
 *
 * <p>Booking now happens under a per-room lock, with the room's active reservations re-read and
 * re-checked for date overlap INSIDE the lock — not before it, since a snapshot taken before
 * acquiring the lock can already be stale by the time the lock is granted. A room's status is
 * now only ever AVAILABLE (bookable, subject to the overlap check) or MAINTENANCE (not bookable
 * at all); "is this room free" is answered per date range from its reservations, never from a
 * single room-wide flag.
 *
 * <p>Lock ordering: every operation here (book/checkIn/checkOut/cancel/markNoShow) acquires at
 * most one room lock at a time, so no ordering rule is needed and deadlock is not possible. If a
 * future feature needs two rooms at once (e.g. transferring a guest between rooms), acquire in
 * ascending room-id order, consistently, the same convention used by
 * {@code zomato.DeliveryAssignmentService} for its order-then-agent locks.
 */
@Service
public class RoomBookingService {

    private final HotelRepository repository;
    private final TariffStrategyFactory tariffStrategyFactory;
    private final CancellationRefundStrategyFactory refundStrategyFactory;
    private final ConcurrentMap<String, ReentrantLock> roomLocks = new ConcurrentHashMap<>();

    public RoomBookingService(HotelRepository repository,
                               TariffStrategyFactory tariffStrategyFactory,
                               CancellationRefundStrategyFactory refundStrategyFactory) {
        this.repository = repository;
        this.tariffStrategyFactory = tariffStrategyFactory;
        this.refundStrategyFactory = refundStrategyFactory;
    }

    private ReentrantLock lockFor(String roomId) {
        // Fair locks so a contended room serves requests in arrival order, not at random.
        return roomLocks.computeIfAbsent(roomId, k -> new ReentrantLock(true));
    }

    /**
     * Atomically book {@code roomId} for {@code [checkIn, checkOut)}.
     *
     * @throws RoomNotFoundException      no such room
     * @throws InvalidDateRangeException  checkOut is not after checkIn
     * @throws RoomUnavailableException   the room is under maintenance, or the range overlaps
     *                                    an existing PENDING/CONFIRMED/CHECKED_IN reservation
     */
    public Booking book(String roomId, String userId, String guestName, LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new InvalidDateRangeException("Check-out must be after check-in");
        }

        ReentrantLock lock = lockFor(roomId);
        lock.lock();
        try {
            // Re-read the room and its bookings INSIDE the lock: this is the line the race
            // was missing. Anything read before lock.lock() may already be stale.
            Room room = repository.getRoom(roomId);
            if (room == null) {
                throw new RoomNotFoundException("Room not found: " + roomId);
            }
            if (room.getStatus() != RoomStatus.AVAILABLE) {
                throw new RoomUnavailableException("Room " + roomId + " is under maintenance");
            }

            List<Booking> active = repository.findActiveBookingsForRoom(roomId);
            for (Booking existing : active) {
                if (existing.overlaps(checkIn, checkOut)) {
                    throw new RoomUnavailableException(
                            "Room " + roomId + " is already booked for an overlapping date range ("
                                    + existing.getCheckIn() + " to " + existing.getCheckOut() + ")");
                }
            }

            TariffStrategy tariff = tariffStrategyFactory.resolve(checkIn, checkOut);
            double totalAmount = tariff.calculateTariff(room, checkIn, checkOut);

            Booking booking = Booking.builder()
                    .id(repository.generateBookingId())
                    .hotelId(room.getHotelId())
                    .roomId(roomId)
                    .userId(userId)
                    .guestName(guestName)
                    .checkIn(checkIn)
                    .checkOut(checkOut)
                    .status(ReservationStatus.PENDING)
                    .tariffStrategyName(tariff.getName())
                    .totalAmount(totalAmount)
                    .createdAt(LocalDateTime.now())
                    .build();

            // Confirm inside the same locked section: the availability check and the commit
            // must be one atomic step, or two racers can both pass the check.
            transition(booking, ReservationStatus.CONFIRMED);
            repository.saveBooking(booking);
            return booking;
        } finally {
            lock.unlock();
        }
    }

    public Booking checkIn(String bookingId) {
        return mutate(bookingId, booking -> transition(booking, ReservationStatus.CHECKED_IN)
                .setCheckedInAt(LocalDateTime.now()));
    }

    public Booking checkOut(String bookingId) {
        return mutate(bookingId, booking -> transition(booking, ReservationStatus.CHECKED_OUT)
                .setCheckedOutAt(LocalDateTime.now()));
    }

    public Booking markNoShow(String bookingId) {
        return mutate(bookingId, booking -> {
            transition(booking, ReservationStatus.NO_SHOW);
            CancellationRefundStrategy strategy = refundStrategyFactory.resolve(booking, LocalDate.now());
            RefundResult refund = strategy.calculateRefund(booking, LocalDate.now());
            booking.setRefundAmount(refund.amount());
            booking.setRefundReason(refund.reason());
        });
    }

    public Booking cancel(String bookingId, LocalDate cancellationDate) {
        LocalDate effectiveDate = cancellationDate != null ? cancellationDate : LocalDate.now();
        return mutate(bookingId, booking -> {
            transition(booking, ReservationStatus.CANCELLED);
            CancellationRefundStrategy strategy = refundStrategyFactory.resolve(booking, effectiveDate);
            RefundResult refund = strategy.calculateRefund(booking, effectiveDate);
            booking.setRefundAmount(refund.amount());
            booking.setRefundReason(refund.reason());
            booking.setCancelledAt(LocalDateTime.now());
        });
    }

    /**
     * Every state-changing operation on a booking goes through the same per-room lock as
     * {@link #book}, re-reading the booking inside the lock — a cancel racing a check-in for
     * the same booking must not let both land.
     */
    private Booking mutate(String bookingId, java.util.function.Consumer<Booking> action) {
        Booking snapshot = repository.getBooking(bookingId);
        if (snapshot == null) {
            throw new BookingNotFoundException("Booking not found: " + bookingId);
        }

        ReentrantLock lock = lockFor(snapshot.getRoomId());
        lock.lock();
        try {
            Booking current = repository.getBooking(bookingId);
            if (current == null) {
                throw new BookingNotFoundException("Booking not found: " + bookingId);
            }
            action.accept(current);
            repository.updateBooking(current);
            return current;
        } finally {
            lock.unlock();
        }
    }

    private Booking transition(Booking booking, ReservationStatus next) {
        if (!booking.getStatus().canTransitionTo(next)) {
            throw new InvalidReservationTransitionException(
                    "Cannot move booking " + booking.getId() + " from " + booking.getStatus()
                            + " to " + next + " — allowed: " + booking.getStatus().allowedNext());
        }
        booking.setStatus(next);
        return booking;
    }

    /** True when {@code roomId} has no active reservation overlapping {@code [checkIn, checkOut)}. */
    public boolean isAvailable(String roomId, LocalDate checkIn, LocalDate checkOut) {
        Room room = repository.getRoom(roomId);
        if (room == null || room.getStatus() != RoomStatus.AVAILABLE) {
            return false;
        }
        return repository.findActiveBookingsForRoom(roomId).stream()
                .noneMatch(b -> b.overlaps(checkIn, checkOut));
    }
}

package com.lld.hotel.service;

import com.lld.hotel.exception.HotelNotFoundException;
import com.lld.hotel.exception.RoomUnavailableException;
import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.SimEvent;
import com.lld.hotel.repository.HotelRepository;
import com.lld.hotel.strategy.CancellationRefundStrategyFactory;
import com.lld.hotel.strategy.FullRefundStrategy;
import com.lld.hotel.strategy.NoRefundStrategy;
import com.lld.hotel.strategy.PartialRefundStrategy;
import com.lld.hotel.strategy.StandardTariffStrategy;
import com.lld.hotel.strategy.TariffStrategyFactory;
import com.lld.hotel.strategy.WeekendTariffStrategy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Facade the controller delegates to wholesale. All booking-lifecycle mutation is delegated
 * further to {@link RoomBookingService}, which owns the per-room locking; this class owns
 * lookups and translates repository state into API-shaped results.
 */
@Service
public class HotelService {

    private final HotelRepository repository;
    private final RoomBookingService bookingService;

    // Isolated Simulation Sandbox — a second, independent repository and booking service so the
    // interactive demo can never read or mutate a real booking. Reuses the real RoomBookingService
    // class (not a duplicate copy of its locking/pricing/refund logic) against fresh strategy
    // instances, the same shape as restaurant's simTableAllocationService/simKitchenService.
    private final HotelRepository simRepository = new HotelRepository();
    private final RoomBookingService simBookingService = new RoomBookingService(
            simRepository,
            new TariffStrategyFactory(new StandardTariffStrategy(), new WeekendTariffStrategy()),
            new CancellationRefundStrategyFactory(new FullRefundStrategy(), new PartialRefundStrategy(), new NoRefundStrategy())
    );
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventSeq = new AtomicLong(0);

    public HotelService(HotelRepository repository, RoomBookingService bookingService) {
        this.repository = repository;
        this.bookingService = bookingService;
    }

    public List<Hotel> getAllHotels() {
        return repository.getAllHotels();
    }

    public Hotel getHotel(String id) {
        Hotel hotel = repository.getHotel(id);
        if (hotel == null) {
            throw new HotelNotFoundException("Hotel not found: " + id);
        }
        return hotel;
    }

    public List<Room> getRoomsByHotel(String hotelId) {
        getHotel(hotelId);
        return repository.getRoomsByHotel(hotelId);
    }

    public List<Room> getAvailableRooms(String hotelId, LocalDate checkIn, LocalDate checkOut) {
        getHotel(hotelId);
        LocalDate ci = checkIn != null ? checkIn : LocalDate.now();
        LocalDate co = checkOut != null ? checkOut : ci.plusDays(1);
        return repository.getRoomsByHotel(hotelId).stream()
                .filter(r -> bookingService.isAvailable(r.getId(), ci, co))
                .collect(Collectors.toList());
    }

    public Booking bookRoom(String roomId, String userId, String guestName, LocalDate checkIn, LocalDate checkOut) {
        return bookingService.book(roomId, userId, guestName, checkIn, checkOut);
    }

    public Booking checkIn(String bookingId) {
        return bookingService.checkIn(bookingId);
    }

    public Booking checkOut(String bookingId) {
        return bookingService.checkOut(bookingId);
    }

    public Booking cancelBooking(String bookingId) {
        return bookingService.cancel(bookingId, LocalDate.now());
    }

    public Booking markNoShow(String bookingId) {
        return bookingService.markNoShow(bookingId);
    }

    public List<Booking> getActiveBookings() {
        return repository.getActiveBookings();
    }

    public Booking getBooking(String id) {
        Booking booking = repository.getBooking(id);
        if (booking == null) {
            throw new com.lld.hotel.exception.BookingNotFoundException("Booking not found: " + id);
        }
        return booking;
    }

    // ==========================================
    // Simulation Sandbox Methods (/sim/*)
    // ==========================================

    public void simReset() {
        simRepository.seed();
        simEventLog.clear();
        simEventSeq.set(0);
        addSimEvent("RESET", "System", "Simulation sandbox re-seeded to initial state", Map.of());
    }

    public Map<String, Object> simState() {
        return Map.of(
                "hotels", simRepository.getAllHotels(),
                "rooms", simRepository.getAllRooms(),
                "bookings", simRepository.getAllBookings()
        );
    }

    public Booking simBook(String roomId, String userId, String guestName, LocalDate checkIn, LocalDate checkOut) {
        Booking booking = simBookingService.book(roomId, userId, guestName, checkIn, checkOut);
        addSimEvent("BOOKED", guestName,
                guestName + " booked " + roomId + " for " + checkIn + " to " + checkOut
                        + " via " + booking.getTariffStrategyName() + " (₹" + booking.getTotalAmount() + ")",
                Map.of("bookingId", booking.getId(), "roomId", roomId, "strategy", booking.getTariffStrategyName(),
                        "amount", booking.getTotalAmount()));
        return booking;
    }

    public Booking simCheckIn(String bookingId, String actorName) {
        Booking booking = simBookingService.checkIn(bookingId);
        addSimEvent("CHECKED_IN", actorName, actorName + " checked in to " + booking.getRoomId(),
                Map.of("bookingId", bookingId, "roomId", booking.getRoomId()));
        return booking;
    }

    public Booking simCheckOut(String bookingId, String actorName) {
        Booking booking = simBookingService.checkOut(bookingId);
        addSimEvent("CHECKED_OUT", actorName, actorName + " checked out of " + booking.getRoomId(),
                Map.of("bookingId", bookingId, "roomId", booking.getRoomId()));
        return booking;
    }

    public Booking simCancel(String bookingId, String actorName) {
        Booking booking = simBookingService.cancel(bookingId, LocalDate.now());
        addSimEvent("CANCELLED", actorName,
                actorName + " cancelled booking " + bookingId + " — " + booking.getRefundReason()
                        + " (₹" + booking.getRefundAmount() + " refunded)",
                Map.of("bookingId", bookingId, "refundAmount", booking.getRefundAmount(),
                        "refundReason", booking.getRefundReason()));
        return booking;
    }

    /**
     * Runs {@code guests} threads that all try to book the same room for the same (overlapping)
     * date range at the same instant. The per-room lock in {@link RoomBookingService} means
     * exactly one can win — this endpoint exists so the UI can show that, rather than asserting it
     * in prose.
     *
     * <p>A CountDownLatch releases every thread together, so they genuinely contend instead of
     * running one after another.
     */
    public Map<String, Object> simRace(String roomId, LocalDate checkIn, LocalDate checkOut, int guests) {
        int n = Math.max(2, Math.min(guests, 8));

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        List<Map<String, Object>> results = new CopyOnWriteArrayList<>();

        try {
            for (int i = 1; i <= n; i++) {
                final String guestName = "Guest-" + i;
                pool.submit(() -> {
                    try {
                        start.await();
                        Booking booking = simBookingService.book(roomId, "sim-" + guestName, guestName, checkIn, checkOut);
                        results.add(Map.of("guest", guestName, "outcome", "WON",
                                "reason", "acquired the lock on " + roomId + " and booked it", "bookingId", booking.getId()));
                    } catch (RoomUnavailableException rejected) {
                        results.add(Map.of("guest", guestName, "outcome", "REJECTED",
                                "reason", rejected.getMessage()));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            if (!done.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Race did not settle within 5 seconds");
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Race was interrupted");
        } finally {
            pool.shutdown();
        }

        results.sort(Comparator.comparing(r -> String.valueOf(r.get("guest"))));
        String winner = results.stream()
                .filter(r -> "WON".equals(r.get("outcome")))
                .map(r -> String.valueOf(r.get("guest")))
                .findFirst()
                .orElse("none");
        long rejected = results.stream().filter(r -> "REJECTED".equals(r.get("outcome"))).count();

        addSimEvent("RACE", winner,
                n + " guests raced to book " + roomId + " for " + checkIn + " to " + checkOut
                        + " — " + winner + " won, " + rejected + " rejected",
                Map.of("roomId", roomId, "attempts", n, "winner", winner, "rejected", rejected));

        return Map.of(
                "roomId", roomId,
                "attempts", n,
                "winner", winner,
                "rejected", rejected,
                "results", results
        );
    }

    public List<SimEvent> simEvents() {
        return new ArrayList<>(simEventLog);
    }

    private void addSimEvent(String type, String actor, String message, Map<String, Object> detail) {
        long id = simEventSeq.incrementAndGet();
        simEventLog.add(SimEvent.builder()
                .id(id)
                .eventType(type)
                .actor(actor)
                .description(message)
                .status("SUCCESS")
                .detail(detail)
                .build());
    }
}

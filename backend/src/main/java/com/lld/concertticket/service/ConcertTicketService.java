package com.lld.concertticket.service;

import com.lld.concertticket.config.ConcertTicketSeedData;
import com.lld.concertticket.enums.BookingStatus;
import com.lld.concertticket.enums.PaymentMethod;
import com.lld.concertticket.exception.*;
import com.lld.concertticket.model.*;
import com.lld.concertticket.repository.ConcertTicketRepository;
import com.lld.concertticket.strategy.CancellationPolicy;
import com.lld.concertticket.strategy.CancellationPolicyFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Facade service — the controller delegates every call here wholesale. Owns the hold-TTL
 * (10 minutes, per the design doc), the PENDING-&gt;CONFIRMED-&gt;CANCELLED/REFUNDED booking
 * workflow, and a second, fully isolated instance of the same machinery for the
 * {@code /sim/*} demo sandbox.
 */
@Service
public class ConcertTicketService {
    private static final long HOLD_DURATION_MS = 10 * 60 * 1000L; // 10 minutes

    private final ConcertTicketRepository repository;
    private final SeatLockManager seatLockManager;
    private final PaymentProcessor paymentProcessor;
    private final CancellationPolicyFactory cancellationPolicyFactory;

    // Idempotency cache for confirmBooking retries
    private final Map<String, Booking> idempotencyCache = new ConcurrentHashMap<>();

    // Isolated simulation engine — separate repository & lock manager instances
    private final ConcertTicketRepository simRepository = new ConcertTicketRepository();
    private final SeatLockManager simSeatLockManager = new SeatLockManager();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public ConcertTicketService(ConcertTicketRepository repository,
                                 SeatLockManager seatLockManager,
                                 PaymentProcessor paymentProcessor,
                                 CancellationPolicyFactory cancellationPolicyFactory) {
        this.repository = repository;
        this.seatLockManager = seatLockManager;
        this.paymentProcessor = paymentProcessor;
        this.cancellationPolicyFactory = cancellationPolicyFactory;
        ConcertTicketSeedData.seed(simRepository);
    }

    // =========================================================================
    // READS
    // =========================================================================

    public List<Venue> getVenues() {
        return repository.getVenues();
    }

    public Venue getVenue(long venueId) {
        Venue venue = repository.findVenueById(venueId);
        if (venue == null) throw new VenueNotFoundException("Venue not found: " + venueId);
        return venue;
    }

    public List<Event> getEvents() {
        return repository.getEvents();
    }

    public Event getEvent(long eventId) {
        Event event = repository.findEventById(eventId);
        if (event == null) throw new EventNotFoundException("Event not found: " + eventId);
        return event;
    }

    public List<Seat> getSeats(long eventId) {
        getEvent(eventId); // 404s if the event doesn't exist
        seatLockManager.expireStaleHolds(eventId, repository);
        return repository.getSeatsByEvent(eventId);
    }

    public List<User> getUsers() {
        return repository.getUsers();
    }

    public Booking getBooking(long bookingId) {
        Booking booking = repository.findBookingById(bookingId);
        if (booking == null) throw new BookingNotFoundException("Booking not found: " + bookingId);
        return booking;
    }

    public List<Booking> getUserBookings(String userId) {
        return repository.getBookingsByUser(userId);
    }

    // =========================================================================
    // SEAT HOLD + BOOKING WORKFLOW (CONCURRENCY LAYER)
    // =========================================================================

    /**
     * design doc: "selectSeats(eventId, seatIds, user) -&gt; Creates a PENDING booking,
     * temporarily holds seats with a 10-minute timer." Delegates the actual race-safe
     * hold to {@link SeatLockManager#holdSeats}; if that throws, no booking is created.
     */
    public Booking selectSeats(long eventId, List<String> seatIds, String userId) {
        getEvent(eventId);
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Must select at least one seat.");
        }

        seatLockManager.holdSeats(eventId, seatIds, userId, HOLD_DURATION_MS, repository);

        double totalAmount = 0.0;
        for (String seatId : seatIds) {
            Seat seat = repository.findSeatById(eventId, seatId);
            if (seat != null) totalAmount += seat.getPrice();
        }

        long expiresAt = System.currentTimeMillis() + HOLD_DURATION_MS;
        Booking booking = Booking.builder()
                .id(repository.nextBookingId())
                .userId(userId)
                .eventId(eventId)
                .seatIds(new ArrayList<>(seatIds))
                .totalAmount(totalAmount)
                .status(BookingStatus.PENDING)
                .holdExpiresAt(expiresAt)
                .bookingTime(LocalDateTime.now())
                .build();
        return repository.saveBooking(booking);
    }

    /**
     * design doc: "confirmBooking(bookingId, paymentDetails) -&gt; Processes payment and
     * confirms booking, or releases seats on failure."
     */
    public Booking confirmBooking(long bookingId, PaymentMethod paymentMethod, String idempotencyKey) {
        if (idempotencyKey != null && idempotencyCache.containsKey(idempotencyKey)) {
            return idempotencyCache.get(idempotencyKey);
        }

        Booking booking = getBooking(bookingId);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BookingFailedException("Booking " + bookingId + " is not awaiting confirmation (status=" + booking.getStatus() + ").");
        }
        if (booking.getHoldExpiresAt() <= System.currentTimeMillis()) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(LocalDateTime.now());
            repository.saveBooking(booking);
            throw new HoldExpiredException("Seat hold for booking " + bookingId + " expired before payment. Please reselect your seats.");
        }

        try {
            seatLockManager.confirmSeats(booking.getEventId(), booking.getSeatIds(), booking.getUserId(), repository);
        } catch (HoldExpiredException e) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(LocalDateTime.now());
            repository.saveBooking(booking);
            throw e;
        }

        String paymentRef;
        try {
            paymentRef = paymentProcessor.processPayment(booking.getUserId(), booking.getTotalAmount(), paymentMethod);
        } catch (Exception e) {
            seatLockManager.releaseSeats(booking.getEventId(), booking.getSeatIds(), repository);
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(LocalDateTime.now());
            repository.saveBooking(booking);
            throw new BookingFailedException("Payment failed: " + e.getMessage());
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentMethod(paymentMethod);
        booking.setPaymentRef(paymentRef);
        Booking saved = repository.saveBooking(booking);

        if (idempotencyKey != null) {
            idempotencyCache.put(idempotencyKey, saved);
        }
        return saved;
    }

    /**
     * design doc: "cancelBooking(bookingId) -&gt; Cancels booking, releases seats,
     * processes refund if applicable." A PENDING hold cancels for free; a CONFIRMED
     * booking's refund is delegated to whichever {@link CancellationPolicy} the days
     * remaining before the event resolve to.
     */
    public Booking cancelBooking(long bookingId) {
        Booking booking = getBooking(bookingId);
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REFUNDED) {
            throw new InvalidCancellationException("Booking " + bookingId + " is already cancelled.");
        }

        Event event = getEvent(booking.getEventId());
        LocalDateTime now = LocalDateTime.now();

        if (booking.getStatus() == BookingStatus.PENDING) {
            seatLockManager.releaseSeats(booking.getEventId(), booking.getSeatIds(), repository);
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(now);
            return repository.saveBooking(booking);
        }

        CancellationPolicy policy = cancellationPolicyFactory.resolve(event.getDateTime(), now);
        double refund = policy.calculateRefund(booking, event.getDateTime(), now);
        booking.setRefundAmount(refund);
        booking.setStatus(refund > 0 ? BookingStatus.REFUNDED : BookingStatus.CANCELLED);
        booking.setCancelledAt(now);
        repository.saveBooking(booking);

        seatLockManager.releaseSeats(booking.getEventId(), booking.getSeatIds(), repository);
        return booking;
    }

    /**
     * design doc: "releaseExpiredHolds() -&gt; Releases seats for PENDING bookings that
     * exceeded hold duration." Runs on a fixed schedule; also callable directly from
     * tests without waiting on the scheduler.
     */
    @Scheduled(fixedRate = 30000)
    public void releaseExpiredHolds() {
        for (Event event : repository.getEvents()) {
            seatLockManager.expireStaleHolds(event.getId(), repository);
        }
        long now = System.currentTimeMillis();
        for (Booking booking : repository.getAllBookings()) {
            if (booking.getStatus() == BookingStatus.PENDING && booking.getHoldExpiresAt() <= now) {
                booking.setStatus(BookingStatus.CANCELLED);
                booking.setCancelledAt(LocalDateTime.now());
                repository.saveBooking(booking);
            }
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/concert-ticket/sim/*)
    // =========================================================================

    public void simReset() {
        ConcertTicketSeedData.seed(simRepository);
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent("SYSTEM_RESET", "System", "Simulation environment reset to initial state.", Map.of(), firstSimEventId());
    }

    public List<Event> simGetEvents() {
        return simRepository.getEvents();
    }

    public List<Seat> simGetSeats(long eventId) {
        simSeatLockManager.expireStaleHolds(eventId, simRepository);
        return simRepository.getSeatsByEvent(eventId);
    }

    public List<SimEvent> simGetEventLog() {
        return new ArrayList<>(simEventLog);
    }

    public Map<String, Object> simSelectSeats(long eventId, List<String> seatIds, String userId, String actorName) {
        try {
            simSeatLockManager.holdSeats(eventId, seatIds, userId, HOLD_DURATION_MS, simRepository);
            double total = 0.0;
            for (String seatId : seatIds) {
                Seat seat = simRepository.findSeatById(eventId, seatId);
                if (seat != null) total += seat.getPrice();
            }
            long expiresAt = System.currentTimeMillis() + HOLD_DURATION_MS;
            Booking booking = Booking.builder()
                    .id(simRepository.nextBookingId())
                    .userId(userId)
                    .eventId(eventId)
                    .seatIds(new ArrayList<>(seatIds))
                    .totalAmount(total)
                    .status(BookingStatus.PENDING)
                    .holdExpiresAt(expiresAt)
                    .bookingTime(LocalDateTime.now())
                    .build();
            simRepository.saveBooking(booking);
            logSimEvent("HOLD_SUCCESS", actorName, actorName + " held seat(s) " + seatIds + " (booking #" + booking.getId() + ")",
                    Map.of("bookingId", booking.getId(), "seatIds", seatIds, "totalAmount", total), eventId);
            return Map.of("status", "SUCCESS", "bookingId", booking.getId(), "seatIds", seatIds, "totalAmount", total);
        } catch (SeatNotAvailableException e) {
            logSimEvent("HOLD_FAILED", actorName, actorName + " failed to hold seat(s) " + seatIds + ": " + e.getMessage(),
                    Map.of("seatIds", seatIds, "error", e.getMessage()), eventId);
            throw e;
        }
    }

    public Booking simConfirmBooking(long bookingId, String actorName) {
        Booking booking = simRepository.findBookingById(bookingId);
        if (booking == null) throw new BookingNotFoundException("Sim booking not found: " + bookingId);
        try {
            simSeatLockManager.confirmSeats(booking.getEventId(), booking.getSeatIds(), booking.getUserId(), simRepository);
            String ref = "SIM-PAY-" + bookingId;
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setPaymentMethod(PaymentMethod.UPI);
            booking.setPaymentRef(ref);
            Booking saved = simRepository.saveBooking(booking);
            logSimEvent("BOOKING_CONFIRMED", actorName,
                    actorName + " confirmed booking #" + bookingId + " for seat(s) " + booking.getSeatIds() + " (Rs" + booking.getTotalAmount() + ")",
                    Map.of("bookingId", bookingId, "seatIds", booking.getSeatIds(), "amount", booking.getTotalAmount()), booking.getEventId());
            return saved;
        } catch (Exception e) {
            booking.setStatus(BookingStatus.CANCELLED);
            simRepository.saveBooking(booking);
            logSimEvent("BOOKING_FAILED", actorName, actorName + " booking #" + bookingId + " failed: " + e.getMessage(),
                    Map.of("bookingId", bookingId, "error", e.getMessage()), booking.getEventId());
            throw e;
        }
    }

    public Booking simCancelBooking(long bookingId, String actorName) {
        Booking booking = simRepository.findBookingById(bookingId);
        if (booking == null) throw new BookingNotFoundException("Sim booking not found: " + bookingId);

        simSeatLockManager.releaseSeats(booking.getEventId(), booking.getSeatIds(), simRepository);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        Booking saved = simRepository.saveBooking(booking);

        logSimEvent("BOOKING_CANCELLED", actorName,
                actorName + " cancelled booking #" + bookingId + " — seat(s) " + booking.getSeatIds() + " returned to AVAILABLE",
                Map.of("bookingId", bookingId, "seatIds", booking.getSeatIds()), booking.getEventId());
        return saved;
    }

    /** Manually fast-forwards a hold to "expired" so the demo can show the reaper sweep without a real 10-minute wait. */
    public void simExpireHold(long eventId, List<String> seatIds, String actorName) {
        for (String seatId : seatIds) {
            Seat seat = simRepository.findSeatById(eventId, seatId);
            if (seat != null) {
                seat.setHoldExpiresAt(1L); // already in the past
                simRepository.updateSeat(seat);
            }
        }
        simSeatLockManager.expireStaleHolds(eventId, simRepository);
        logSimEvent("HOLD_EXPIRED", actorName, "Hold TTL expired for seat(s) " + seatIds + " — reaper released them to AVAILABLE",
                Map.of("seatIds", seatIds), eventId);
    }

    private long firstSimEventId() {
        List<Event> events = simRepository.getEvents();
        return events.isEmpty() ? 0L : events.get(0).getId();
    }

    private void logSimEvent(String type, String actor, String description, Map<String, Object> data, long eventId) {
        Map<String, String> snapshot = new LinkedHashMap<>();
        for (Seat s : simRepository.getSeatsByEvent(eventId)) {
            snapshot.put(s.getId(), s.getStatus().name());
        }
        SimEvent event = SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(LocalDateTime.now(ZoneId.systemDefault()).toString())
                .eventType(type)
                .actor(actor)
                .description(description)
                .data(data)
                .seatSnapshot(snapshot)
                .build();
        simEventLog.add(event);
    }
}

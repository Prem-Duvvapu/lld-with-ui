package com.lld.movieticket.service;

import com.lld.movieticket.exception.*;
import com.lld.movieticket.model.*;
import com.lld.movieticket.observer.SeatMapNotifier;
import com.lld.movieticket.repository.MovieTicketRepository;
import com.lld.movieticket.strategy.BasePricingStrategy;
import com.lld.movieticket.strategy.PricingStrategy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MovieTicketService {
    private final MovieTicketRepository repository;
    private final SeatLockManager seatLockManager;
    private final PaymentProcessor paymentProcessor;
    private final SeatMapNotifier seatMapNotifier;
    private final PricingStrategy pricingStrategy;

    // Idempotency cache: key -> Booking
    private final Map<String, Booking> idempotencyCache = new ConcurrentHashMap<>();

    // Simulation Engine Isolation
    private final MovieTicketRepository simRepository;
    private final SeatLockManager simSeatLockManager;
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public MovieTicketService(MovieTicketRepository repository,
                              SeatLockManager seatLockManager,
                              PaymentProcessor paymentProcessor,
                              SeatMapNotifier seatMapNotifier,
                              BasePricingStrategy basePricingStrategy) {
        this.repository = repository;
        this.seatLockManager = seatLockManager;
        this.paymentProcessor = paymentProcessor;
        this.seatMapNotifier = seatMapNotifier;
        this.pricingStrategy = basePricingStrategy;

        // Initialize simulation engine repository & locks
        this.simRepository = new MovieTicketRepository();
        this.simSeatLockManager = new SeatLockManager();
    }

    public List<Movie> getMovies() {
        return repository.getMovies();
    }

    public List<Theater> getTheaters() {
        return repository.getTheaters();
    }

    public List<Show> getShows(long movieId) {
        Movie movie = repository.findMovieById(movieId);
        if (movie == null) throw new InvalidShowException("Movie with ID " + movieId + " not found.");
        return repository.getShowsByMovie(movieId);
    }

    public List<Seat> getSeats(long showId) {
        Show show = repository.findShowById(showId);
        if (show == null) throw new InvalidShowException("Show with ID " + showId + " not found.");
        // Expire stale holds first to ensure accurate map
        seatLockManager.expireStaleHolds(showId, repository, seatMapNotifier);
        return repository.getSeatsByShow(showId);
    }

    public List<User> getUsers() {
        return repository.getUsers();
    }

    public Map<String, Object> holdSeats(long showId, List<Long> seatIds, String userId) {
        Show show = repository.findShowById(showId);
        if (show == null) throw new InvalidShowException("Show with ID " + showId + " not found.");
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Must select at least one seat to hold.");
        }

        long holdDurationMs = 5 * 60 * 1000L; // 5 minutes
        seatLockManager.holdSeats(showId, seatIds, userId, holdDurationMs, repository, seatMapNotifier);

        long expiresAt = System.currentTimeMillis() + holdDurationMs;
        double totalAmount = 0.0;
        for (Long sId : seatIds) {
            Seat seat = repository.findSeatById(showId, sId);
            if (seat != null) {
                totalAmount += pricingStrategy.calculatePrice(show, seat);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("showId", showId);
        result.put("seatIds", seatIds);
        result.put("userId", userId);
        result.put("status", "HELD");
        result.put("totalAmount", totalAmount);
        result.put("expiresAt", expiresAt);
        result.put("ttlSeconds", 300);
        return result;
    }

    public Booking bookSeats(long showId, List<Long> seatIds, String userId) {
        return bookSeats(showId, seatIds, userId, PaymentMethod.UPI, null);
    }

    public Booking bookSeats(long showId, List<Long> seatIds, String userId, PaymentMethod paymentMethod, String idempotencyKey) {
        if (idempotencyKey != null && idempotencyCache.containsKey(idempotencyKey)) {
            return idempotencyCache.get(idempotencyKey);
        }

        Show show = repository.findShowById(showId);
        if (show == null) throw new InvalidShowException("Show with ID " + showId + " not found.");
        if (seatIds == null || seatIds.isEmpty()) {
            throw new IllegalArgumentException("Must specify seats to book.");
        }

        // Check if seats are currently held by this user, or perform direct hold if available
        try {
            seatLockManager.confirmSeats(showId, seatIds, userId, repository, seatMapNotifier);
        } catch (BookingFailedException e) {
            // Try holding first if user skipped hold step
            seatLockManager.holdSeats(showId, seatIds, userId, 60000L, repository, seatMapNotifier);
            seatLockManager.confirmSeats(showId, seatIds, userId, repository, seatMapNotifier);
        }

        double totalAmount = 0.0;
        for (Long sId : seatIds) {
            Seat seat = repository.findSeatById(showId, sId);
            if (seat != null) {
                totalAmount += pricingStrategy.calculatePrice(show, seat);
            }
        }

        // Process mocked payment
        try {
            paymentProcessor.processPayment(userId, totalAmount, paymentMethod);
        } catch (Exception e) {
            // Revert seats back to AVAILABLE on payment failure
            seatLockManager.releaseSeats(showId, seatIds, userId, repository, seatMapNotifier);
            throw new BookingFailedException("Payment failed: " + e.getMessage());
        }

        // Update show available count
        show.setAvailableSeats(Math.max(0, show.getAvailableSeats() - seatIds.size()));
        repository.updateShow(show);

        Booking booking = new Booking(
            repository.nextBookingId(), showId, seatIds, userId,
            BookingStatus.CONFIRMED, paymentMethod, totalAmount, LocalDateTime.now()
        );
        Booking saved = repository.saveBooking(booking);

        if (idempotencyKey != null) {
            idempotencyCache.put(idempotencyKey, saved);
        }

        return saved;
    }

    public Booking cancelBooking(long bookingId) {
        Booking booking = repository.findBookingById(bookingId);
        if (booking == null) throw new IllegalArgumentException("Booking " + bookingId + " not found.");
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new CancellationFailedException("Booking " + bookingId + " is already cancelled.");
        }

        booking.setBookingStatus(BookingStatus.CANCELLED);
        repository.saveBooking(booking);

        Show show = repository.findShowById(booking.getShowId());
        if (show != null) {
            show.setAvailableSeats(show.getAvailableSeats() + booking.getSeatIds().size());
            repository.updateShow(show);
        }

        // Release seats back to AVAILABLE
        seatLockManager.cancelBookedSeats(booking.getShowId(), booking.getSeatIds(), repository, seatMapNotifier);

        return booking;
    }

    public Booking getBooking(long bookingId) {
        Booking booking = repository.findBookingById(bookingId);
        if (booking == null) throw new IllegalArgumentException("Booking " + bookingId + " not found.");
        return booking;
    }

    public List<Booking> getUserBookings(String userId) {
        return repository.getBookingsByUserId(userId);
    }

    @Scheduled(fixedRate = 30000)
    public void cleanupExpiredHolds() {
        for (Show s : repository.getShowsByMovie(1)) {
            seatLockManager.expireStaleHolds(s.getId(), repository, seatMapNotifier);
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION METHODS (/api/movie-ticket/sim/*)
    // =========================================================================

    public void simReset() {
        simRepository.seedInitialData();
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent("SYSTEM_RESET", "System", "Simulation environment reset to initial state.", Map.of(), simRepository.getSeatsByShow(1));
    }

    public List<Seat> simGetSeats(long showId) {
        simSeatLockManager.expireStaleHolds(showId, simRepository, null);
        return simRepository.getSeatsByShow(showId);
    }

    public List<SimEvent> simGetEvents() {
        return new ArrayList<>(simEventLog);
    }

    public Map<String, Object> simHoldSeats(long showId, List<Long> seatIds, String userId, String actorName) {
        Show show = simRepository.findShowById(showId);
        if (show == null) throw new InvalidShowException("Sim Show not found");
        try {
            simSeatLockManager.holdSeats(showId, seatIds, userId, 300000L, simRepository, null);
            double total = 0.0;
            for (Long sid : seatIds) {
                Seat seat = simRepository.findSeatById(showId, sid);
                if (seat != null) total += pricingStrategy.calculatePrice(show, seat);
            }
            logSimEvent("HOLD_SUCCESS", actorName, actorName + " successfully held seat(s) " + seatIds, Map.of("seatIds", seatIds, "showId", showId), simRepository.getSeatsByShow(showId));
            return Map.of("status", "SUCCESS", "seatIds", seatIds, "totalAmount", total);
        } catch (SeatNotAvailableException e) {
            logSimEvent("HOLD_FAILED", actorName, actorName + " failed to hold seat(s) " + seatIds + ": " + e.getMessage(), Map.of("seatIds", seatIds, "error", e.getMessage()), simRepository.getSeatsByShow(showId));
            throw e;
        }
    }

    public Booking simBookSeats(long showId, List<Long> seatIds, String userId, String actorName) {
        Show show = simRepository.findShowById(showId);
        try {
            simSeatLockManager.confirmSeats(showId, seatIds, userId, simRepository, null);
            double total = 0.0;
            for (Long sid : seatIds) {
                Seat seat = simRepository.findSeatById(showId, sid);
                if (seat != null) total += pricingStrategy.calculatePrice(show, seat);
            }
            show.setAvailableSeats(Math.max(0, show.getAvailableSeats() - seatIds.size()));
            simRepository.updateShow(show);

            Booking booking = new Booking(simRepository.nextBookingId(), showId, seatIds, userId, BookingStatus.CONFIRMED, PaymentMethod.UPI, total, LocalDateTime.now());
            Booking saved = simRepository.saveBooking(booking);

            logSimEvent("BOOKING_CONFIRMED", actorName, actorName + " booked seat(s) " + seatIds + " (₹" + total + ")", Map.of("bookingId", saved.getId(), "seatIds", seatIds, "amount", total), simRepository.getSeatsByShow(showId));
            return saved;
        } catch (Exception e) {
            logSimEvent("BOOKING_FAILED", actorName, actorName + " booking failed for seat(s) " + seatIds + ": " + e.getMessage(), Map.of("seatIds", seatIds, "error", e.getMessage()), simRepository.getSeatsByShow(showId));
            throw new BookingFailedException(e.getMessage());
        }
    }

    public void simExpireHold(long showId, List<Long> seatIds, String actorName) {
        simSeatLockManager.releaseSeats(showId, seatIds, "EXPIRED", simRepository, null);
        logSimEvent("HOLD_EXPIRED", actorName, "Hold TTL expired for seat(s) " + seatIds + " — seats auto-released to AVAILABLE", Map.of("seatIds", seatIds), simRepository.getSeatsByShow(showId));
    }

    public Booking simCancelBooking(long bookingId, String actorName) {
        Booking booking = simRepository.findBookingById(bookingId);
        if (booking == null) throw new IllegalArgumentException("Sim booking not found");
        booking.setBookingStatus(BookingStatus.CANCELLED);
        simRepository.saveBooking(booking);

        Show show = simRepository.findShowById(booking.getShowId());
        if (show != null) {
            show.setAvailableSeats(show.getAvailableSeats() + booking.getSeatIds().size());
            simRepository.updateShow(show);
        }

        simSeatLockManager.cancelBookedSeats(booking.getShowId(), booking.getSeatIds(), simRepository, null);
        logSimEvent("BOOKING_CANCELLED", actorName, actorName + " cancelled booking #" + bookingId + " for seat(s) " + booking.getSeatIds() + " — seats returned to AVAILABLE", Map.of("bookingId", bookingId, "seatIds", booking.getSeatIds()), simRepository.getSeatsByShow(show.getId()));
        return booking;
    }

    private void logSimEvent(String eventType, String actorName, String description, Map<String, Object> data, List<Seat> currentSeats) {
        Map<Long, String> snapshot = new LinkedHashMap<>();
        for (Seat s : currentSeats) {
            snapshot.put(s.getId(), s.getStatus().name());
        }
        SimEvent event = new SimEvent(
            simEventIdGen.getAndIncrement(),
            LocalDateTime.now().toString(),
            eventType,
            actorName,
            description,
            data,
            snapshot
        );
        simEventLog.add(event);
    }
}

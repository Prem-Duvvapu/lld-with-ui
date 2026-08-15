package com.lld.airline.service;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.SeatClass;
import com.lld.airline.enums.SeatStatus;
import com.lld.airline.exception.BookingFailedException;
import com.lld.airline.exception.FlightNotFoundException;
import com.lld.airline.exception.InvalidCancellationException;
import com.lld.airline.model.*;
import com.lld.airline.strategy.ClassBasedPricingStrategy;
import com.lld.airline.strategy.PricingStrategy;
import com.lld.airline.strategy.RefundPolicy;
import com.lld.airline.strategy.TieredCancellationRefundPolicy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class AirlineService {

    private static volatile AirlineService instance;

    // Real Repositories
    private final Map<String, Aircraft> aircrafts = new ConcurrentHashMap<>();
    private final Map<String, Flight> flightsById = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookingsById = new ConcurrentHashMap<>();
    private final Map<String, List<String>> userBookings = new ConcurrentHashMap<>();
    private final AtomicLong bookingIdGen = new AtomicLong(1001);

    private final SeatLockManager seatLockManager;
    private final PaymentProcessor paymentProcessor;
    private final RefundPolicy refundPolicy;
    private final PricingStrategy pricingStrategy;

    // Isolated Simulation Engine State
    private final Map<String, Flight> simFlightsById = new ConcurrentHashMap<>();
    private final Map<String, Booking> simBookingsById = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private final AtomicLong simBookingIdGen = new AtomicLong(9001);

    public AirlineService(SeatLockManager seatLockManager,
                          PaymentProcessor paymentProcessor,
                          RefundPolicy refundPolicy,
                          PricingStrategy pricingStrategy) {
        this.seatLockManager = seatLockManager != null ? seatLockManager : new SeatLockManager();
        this.paymentProcessor = paymentProcessor != null ? paymentProcessor : new PaymentProcessor();
        this.refundPolicy = refundPolicy != null ? refundPolicy : new TieredCancellationRefundPolicy();
        this.pricingStrategy = pricingStrategy != null ? pricingStrategy : new ClassBasedPricingStrategy();

        initDefaultData();
        simReset();
    }

    public static AirlineService getInstance() {
        if (instance == null) {
            synchronized (AirlineService.class) {
                if (instance == null) {
                    instance = new AirlineService(new SeatLockManager(), new PaymentProcessor(),
                            new TieredCancellationRefundPolicy(), new ClassBasedPricingStrategy());
                }
            }
        }
        return instance;
    }

    // =========================================================================
    // AIRCRAFT & FLIGHT MANAGEMENT
    // =========================================================================

    public Aircraft registerAircraft(String model, String tailNumber, List<SeatTemplate> templates) {
        Aircraft aircraft = new Aircraft(model, tailNumber, templates);
        aircrafts.put(tailNumber, aircraft);
        return aircraft;
    }

    public Flight createFlight(String flightNumber, String source, String destination,
                               LocalDateTime departureTime, LocalDateTime arrivalTime, Aircraft aircraft) {
        String flightId = flightNumber + "-" + departureTime.toLocalDate().toString().replace("-", "");
        Flight flight = new Flight(flightId, flightNumber, source, destination, departureTime, arrivalTime, aircraft);
        flightsById.put(flightId, flight);
        return flight;
    }

    public Flight getFlight(String flightId) {
        Flight flight = flightsById.get(flightId);
        if (flight == null) {
            throw new FlightNotFoundException("Flight not found with ID: " + flightId);
        }
        return flight;
    }

    public List<Flight> getAllFlights() {
        return new ArrayList<>(flightsById.values());
    }

    public List<Flight> searchFlights(String source, String destination, LocalDate date) {
        return flightsById.values().stream()
                .filter(f -> (source == null || source.isBlank() || f.getSource().equalsIgnoreCase(source.trim())) &&
                             (destination == null || destination.isBlank() || f.getDestination().equalsIgnoreCase(destination.trim())) &&
                             (date == null || f.getDepartureTime().toLocalDate().equals(date)))
                .collect(Collectors.toList());
    }

    // =========================================================================
    // SEAT HOLD & BOOKING CORE WORKFLOWS (CONCURRENCY LAYER)
    // =========================================================================

    public void holdSeats(String flightId, List<String> seatNumbers, String userId) {
        Flight flight = getFlight(flightId);
        if (seatNumbers == null || seatNumbers.isEmpty()) {
            throw new IllegalArgumentException("Must select at least one seat to hold.");
        }
        // 5-minute hold TTL (300,000 ms)
        seatLockManager.holdSeats(flightId, seatNumbers, userId, 300000L, flight);
    }

    public Booking bookFlight(String flightId, List<String> seatNumbers, List<Passenger> passengers,
                              String userId, String paymentMethod, String idempotencyKey) {
        Flight flight = getFlight(flightId);

        if (seatNumbers == null || passengers == null || seatNumbers.size() != passengers.size() || seatNumbers.isEmpty()) {
            throw new BookingFailedException("Passenger list and seat number list must be non-empty and matching in size.");
        }

        // 1. Confirm and Lock Seats under SeatLockManager
        seatLockManager.confirmSeats(flightId, seatNumbers, userId, flight);

        // 2. Calculate Total Price
        double totalAmount = 0.0;
        for (String seatNum : seatNumbers) {
            Seat s = flight.getSeat(seatNum);
            totalAmount += (s != null ? s.getBasePrice() : 4500.0);
        }

        // 3. Process Payment Idempotently
        String bookingId = "BK-" + bookingIdGen.getAndIncrement();
        try {
            paymentProcessor.processPayment(bookingId, totalAmount, paymentMethod, idempotencyKey);
        } catch (Exception e) {
            // Revert seats if payment fails
            seatLockManager.releaseSeats(flightId, seatNumbers, flight);
            throw new BookingFailedException("Payment processing failed: " + e.getMessage());
        }

        // 4. Register Booking Entity
        Booking booking = new Booking(bookingId, flightId, userId, passengers, seatNumbers, totalAmount);
        booking.setStatus(BookingStatus.CONFIRMED);

        bookingsById.put(bookingId, booking);
        userBookings.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(bookingId);

        return booking;
    }

    public Booking cancelBooking(String bookingId) {
        Booking booking = bookingsById.get(bookingId);
        if (booking == null) {
            throw new InvalidCancellationException("Booking not found: " + bookingId);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REFUNDED) {
            throw new InvalidCancellationException("Booking has already been cancelled.");
        }

        Flight flight = flightsById.get(booking.getFlightId());
        if (flight == null) {
            throw new FlightNotFoundException("Flight not found for booking: " + booking.getFlightId());
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(flight.getDepartureTime())) {
            throw new InvalidCancellationException("Cannot cancel booking for a flight that has already departed.");
        }

        // Calculate refund via Strategy Pattern
        double refund = refundPolicy.calculateRefund(booking, flight.getDepartureTime(), now);
        booking.setRefundAmount(refund);
        booking.setStatus(refund > 0 ? BookingStatus.REFUNDED : BookingStatus.CANCELLED);
        booking.setCancelledAt(java.time.Instant.now());

        // Release seats back to AVAILABLE
        seatLockManager.releaseSeats(flight.getFlightId(), booking.getSeatNumbers(), flight);

        return booking;
    }

    public List<Booking> getUserBookings(String userId) {
        List<String> bIds = userBookings.getOrDefault(userId, Collections.emptyList());
        return bIds.stream()
                .map(bookingsById::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public Booking getBooking(String bookingId) {
        Booking b = bookingsById.get(bookingId);
        if (b == null) {
            throw new InvalidCancellationException("Booking not found: " + bookingId);
        }
        return b;
    }

    // =========================================================================
    // SCHEDULED STALE HOLD CLEANUP
    // =========================================================================

    @Scheduled(fixedRate = 30000)
    public void scheduledStaleHoldCleanup() {
        for (Flight flight : flightsById.values()) {
            seatLockManager.expireStaleHolds(flight);
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/airline/sim/*)
    // =========================================================================

    public synchronized void simReset() {
        simEventLog.clear();
        simFlightsById.clear();
        simBookingsById.clear();

        // Standard 737 seat layout template
        List<SeatTemplate> templates = new ArrayList<>();
        // Business: 1A, 1B, 1C, 1D
        templates.add(new SeatTemplate("1A", SeatClass.BUSINESS, true, false));
        templates.add(new SeatTemplate("1B", SeatClass.BUSINESS, false, true));
        templates.add(new SeatTemplate("1C", SeatClass.BUSINESS, false, true));
        templates.add(new SeatTemplate("1D", SeatClass.BUSINESS, true, false));

        // Economy: 12A, 12B, 12C, 12D, 12E, 12F
        templates.add(new SeatTemplate("12A", SeatClass.ECONOMY, true, false));
        templates.add(new SeatTemplate("12B", SeatClass.ECONOMY, false, false));
        templates.add(new SeatTemplate("12C", SeatClass.ECONOMY, false, true));
        templates.add(new SeatTemplate("12D", SeatClass.ECONOMY, false, true));
        templates.add(new SeatTemplate("12E", SeatClass.ECONOMY, false, false));
        templates.add(new SeatTemplate("12F", SeatClass.ECONOMY, true, false));

        Aircraft simAircraft = new Aircraft("Boeing 737-800", "SIM-VT-737", templates);

        LocalDateTime dep = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0);
        LocalDateTime arr = dep.plusHours(2).plusMinutes(15);
        Flight simFlight = new Flight("SIM-AI-202", "AI202", "DEL", "BOM", dep, arr, simAircraft);

        // Pre-fill most seats to set up a Last-Seat Race collision on 12A, 12B, 12C
        simFlight.getSeat("1A").setStatus(SeatStatus.BOOKED);
        simFlight.getSeat("1B").setStatus(SeatStatus.BOOKED);
        simFlight.getSeat("1C").setStatus(SeatStatus.BOOKED);
        simFlight.getSeat("1D").setStatus(SeatStatus.BOOKED);
        simFlight.getSeat("12D").setStatus(SeatStatus.BOOKED);
        simFlight.getSeat("12E").setStatus(SeatStatus.BOOKED);
        simFlight.getSeat("12F").setStatus(SeatStatus.BOOKED);

        simFlightsById.put(simFlight.getFlightId(), simFlight);

        logSimEvent("SIM_RESET", "System",
                "Initialized simulation flight AI202 (DEL -> BOM) with only 3 Economy seats available: 12A, 12B, 12C.", null);
    }

    public synchronized Map<String, Object> simHold(String flightId, List<String> seatNumbers, String userId) {
        Flight flight = simFlightsById.get(flightId);
        if (flight == null) {
            logSimEvent("HOLD_FAILED", userId, "Flight not found: " + flightId, null);
            return getSimSnapshots();
        }

        try {
            seatLockManager.holdSeats(flightId, seatNumbers, userId, 60000L, flight); // 60s for sim
            logSimEvent("HOLD_SUCCESS", userId,
                    String.format("Held seats %s for 60 seconds.", seatNumbers),
                    Map.of("seats", seatNumbers, "userId", userId));
        } catch (Exception e) {
            logSimEvent("HOLD_COLLISION", userId,
                    String.format("Failed to hold %s: %s", seatNumbers, e.getMessage()), null);
        }
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simBook(String flightId, List<String> seatNumbers, String passengerName, String userId) {
        Flight flight = simFlightsById.get(flightId);
        if (flight == null) return getSimSnapshots();

        try {
            seatLockManager.confirmSeats(flightId, seatNumbers, userId, flight);

            double total = seatNumbers.size() * 4500.0;
            String bId = "SIM-BK-" + simBookingIdGen.getAndIncrement();
            List<Passenger> passengers = seatNumbers.stream()
                    .map(s -> new Passenger("P-" + s, passengerName + " (" + s + ")", "user@sim.com", "A1234567"))
                    .toList();

            Booking booking = new Booking(bId, flightId, userId, passengers, seatNumbers, total);
            booking.setStatus(BookingStatus.CONFIRMED);
            simBookingsById.put(bId, booking);

            logSimEvent("BOOKING_CONFIRMED", userId,
                    String.format("Confirmed booking %s for seats %s (Total: ₹%.2f).", bId, seatNumbers, total),
                    Map.of("bookingId", bId, "seats", seatNumbers));
        } catch (Exception e) {
            logSimEvent("BOOKING_FAILED", userId,
                    String.format("Booking commit rejected for %s: %s", seatNumbers, e.getMessage()), null);
        }
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simCancel(String bookingId, int hoursBeforeDeparture) {
        Booking booking = simBookingsById.get(bookingId);
        if (booking == null) {
            logSimEvent("CANCEL_FAILED", "User", "Booking not found: " + bookingId, null);
            return getSimSnapshots();
        }

        Flight flight = simFlightsById.get(booking.getFlightId());
        LocalDateTime cancelTime = flight.getDepartureTime().minusHours(hoursBeforeDeparture);

        double refund = refundPolicy.calculateRefund(booking, flight.getDepartureTime(), cancelTime);
        booking.setRefundAmount(refund);
        booking.setStatus(refund > 0 ? BookingStatus.REFUNDED : BookingStatus.CANCELLED);
        booking.setCancelledAt(java.time.Instant.now());

        seatLockManager.releaseSeats(flight.getFlightId(), booking.getSeatNumbers(), flight);

        logSimEvent("BOOKING_CANCELLED", booking.getUserId(),
                String.format("Cancelled %s at T-%d hours. Refund: ₹%.2f (%.0f%%). Seats %s released to AVAILABLE.",
                        bookingId, hoursBeforeDeparture, refund, (refund / booking.getTotalAmount()) * 100, booking.getSeatNumbers()),
                Map.of("refund", refund, "seats", booking.getSeatNumbers()));

        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simExpireHold(String flightId) {
        Flight flight = simFlightsById.get(flightId);
        if (flight != null) {
            for (Seat seat : flight.getAllSeats()) {
                if (seat.getStatus() == SeatStatus.HELD) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    logSimEvent("HOLD_EXPIRED", "System",
                            String.format("Hold TTL expired on seat %s. Reverted to AVAILABLE.", seat.getSeatNumber()), null);
                }
            }
        }
        return getSimSnapshots();
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("flights", simFlightsById.values());
        res.put("bookings", simBookingsById.values());
        res.put("events", simEventLog);
        return res;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }

    // =========================================================================
    // SEED DATA INITIALIZATION
    // =========================================================================

    private void initDefaultData() {
        // Standard Boeing 737 Layout
        List<SeatTemplate> b737Templates = new ArrayList<>();
        // Row 1-2: Business
        for (int r = 1; r <= 2; r++) {
            b737Templates.add(new SeatTemplate(r + "A", SeatClass.BUSINESS, true, false));
            b737Templates.add(new SeatTemplate(r + "C", SeatClass.BUSINESS, false, true));
            b737Templates.add(new SeatTemplate(r + "D", SeatClass.BUSINESS, false, true));
            b737Templates.add(new SeatTemplate(r + "F", SeatClass.BUSINESS, true, false));
        }
        // Row 3-15: Economy
        for (int r = 3; r <= 15; r++) {
            b737Templates.add(new SeatTemplate(r + "A", SeatClass.ECONOMY, true, false));
            b737Templates.add(new SeatTemplate(r + "B", SeatClass.ECONOMY, false, false));
            b737Templates.add(new SeatTemplate(r + "C", SeatClass.ECONOMY, false, true));
            b737Templates.add(new SeatTemplate(r + "D", SeatClass.ECONOMY, false, true));
            b737Templates.add(new SeatTemplate(r + "E", SeatClass.ECONOMY, false, false));
            b737Templates.add(new SeatTemplate(r + "F", SeatClass.ECONOMY, true, false));
        }

        Aircraft ac1 = registerAircraft("Boeing 737-800", "VT-AXN", b737Templates);
        Aircraft ac2 = registerAircraft("Airbus A320neo", "VT-IND", b737Templates);

        LocalDateTime now = LocalDateTime.now();
        createFlight("AI-202", "DEL", "BOM", now.plusDays(3).withHour(8).withMinute(0), now.plusDays(3).withHour(10).withMinute(15), ac1);
        createFlight("6E-505", "BOM", "BLR", now.plusDays(3).withHour(14).withMinute(30), now.plusDays(3).withHour(16).withMinute(15), ac2);
        createFlight("UK-818", "DEL", "BLR", now.plusDays(4).withHour(18).withMinute(0), now.plusDays(4).withHour(20).withMinute(45), ac1);
    }
}

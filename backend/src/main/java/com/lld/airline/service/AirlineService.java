package com.lld.airline.service;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.FareType;
import com.lld.airline.enums.PricingModel;
import com.lld.airline.enums.SeatClass;
import com.lld.airline.enums.SeatStatus;
import com.lld.airline.exception.BookingFailedException;
import com.lld.airline.exception.FlightNotFoundException;
import com.lld.airline.exception.InvalidCancellationException;
import com.lld.airline.model.*;
import com.lld.airline.repository.AirlineRepository;
import com.lld.airline.strategy.PricingStrategyFactory;
import com.lld.airline.strategy.RefundPolicyFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

    // Real repository (live state)
    private final AirlineRepository repository;

    private final SeatLockManager seatLockManager;
    private final PaymentProcessor paymentProcessor;
    private final RefundPolicyFactory refundPolicyFactory;
    private final PricingStrategyFactory pricingStrategyFactory;

    // Isolated Simulation Engine State — a fixed demo flight/booking sandbox, deliberately kept
    // separate from AirlineRepository so /sim/* traffic can never corrupt the live catalog.
    private final Map<String, Flight> simFlightsById = new ConcurrentHashMap<>();
    private final Map<String, Booking> simBookingsById = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private final AtomicLong simBookingIdGen = new AtomicLong(9001);

    /**
     * Convenience constructor for tests that don't care about repository isolation — builds a
     * private {@link AirlineRepository}. Spring never sees this one: with two constructors present
     * and neither a no-arg default, the primary constructor below must be the explicit
     * {@code @Autowired} target or context startup fails with "No default constructor found"
     * (RCA-024).
     */
    public AirlineService(SeatLockManager seatLockManager,
                          PaymentProcessor paymentProcessor,
                          RefundPolicyFactory refundPolicyFactory,
                          PricingStrategyFactory pricingStrategyFactory) {
        this(new AirlineRepository(), seatLockManager, paymentProcessor, refundPolicyFactory, pricingStrategyFactory);
    }

    @Autowired
    public AirlineService(AirlineRepository repository,
                          SeatLockManager seatLockManager,
                          PaymentProcessor paymentProcessor,
                          RefundPolicyFactory refundPolicyFactory,
                          PricingStrategyFactory pricingStrategyFactory) {
        this.repository = repository != null ? repository : new AirlineRepository();
        this.seatLockManager = seatLockManager != null ? seatLockManager : new SeatLockManager();
        this.paymentProcessor = paymentProcessor != null ? paymentProcessor : new PaymentProcessor();
        this.refundPolicyFactory = refundPolicyFactory;
        this.pricingStrategyFactory = pricingStrategyFactory;

        initDefaultData();
        simReset();
    }

    // =========================================================================
    // AIRCRAFT & FLIGHT MANAGEMENT
    // =========================================================================

    public Aircraft registerAircraft(String model, String tailNumber, List<SeatTemplate> templates) {
        Aircraft aircraft = Aircraft.of(model, tailNumber, templates);
        return repository.saveAircraft(aircraft);
    }

    public Flight createFlight(String flightNumber, String source, String destination,
                               LocalDateTime departureTime, LocalDateTime arrivalTime, Aircraft aircraft,
                               PricingModel pricingModel) {
        String flightId = flightNumber + "-" + departureTime.toLocalDate().toString().replace("-", "");
        Flight flight = Flight.create(flightId, flightNumber, source, destination, departureTime, arrivalTime,
                aircraft, pricingStrategyFactory.forModel(pricingModel));
        return repository.saveFlight(flight);
    }

    public Flight getFlight(String flightId) {
        Flight flight = repository.findFlightById(flightId);
        if (flight == null) {
            throw new FlightNotFoundException("Flight not found with ID: " + flightId);
        }
        return flight;
    }

    public List<Flight> getAllFlights() {
        return repository.getAllFlights();
    }

    public List<Flight> searchFlights(String source, String destination, LocalDate date) {
        return repository.getAllFlights().stream()
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
        return bookFlight(flightId, seatNumbers, passengers, userId, paymentMethod, idempotencyKey, FareType.FLEXIBLE);
    }

    public Booking bookFlight(String flightId, List<String> seatNumbers, List<Passenger> passengers,
                              String userId, String paymentMethod, String idempotencyKey, FareType fareType) {
        Flight flight = getFlight(flightId);

        if (seatNumbers == null || passengers == null || seatNumbers.size() != passengers.size() || seatNumbers.isEmpty()) {
            throw new BookingFailedException("Passenger list and seat number list must be non-empty and matching in size.");
        }

        // 1. Confirm and Lock Seats under SeatLockManager. This is also where overbooking is
        // rejected: confirmSeats re-validates every seat is still HELD by this user under an
        // ascending-order multi-seat lock, so a seat someone else already booked (or that this
        // user never actually held) throws instead of silently double-selling it.
        seatLockManager.confirmSeats(flightId, seatNumbers, userId, flight);

        // 2. Calculate Total Price from the seats' strategy-computed base prices
        double totalAmount = computeTotal(flight, seatNumbers);

        // 3. Process Payment Idempotently
        String bookingId = repository.nextBookingId();
        try {
            paymentProcessor.processPayment(bookingId, totalAmount, paymentMethod, idempotencyKey);
        } catch (Exception e) {
            // Revert seats if payment fails
            seatLockManager.releaseSeats(flightId, seatNumbers, flight);
            throw new BookingFailedException("Payment processing failed: " + e.getMessage());
        }

        // 4. Register Booking Entity
        Booking booking = Booking.builder()
                .bookingId(bookingId)
                .flightId(flightId)
                .userId(userId)
                .passengers(passengers)
                .seatNumbers(seatNumbers)
                .totalAmount(totalAmount)
                .fareType(fareType != null ? fareType : FareType.FLEXIBLE)
                .status(BookingStatus.CONFIRMED)
                .build();

        return repository.saveBooking(booking);
    }

    private double computeTotal(Flight flight, List<String> seatNumbers) {
        double total = 0.0;
        for (String seatNum : seatNumbers) {
            Seat s = flight.getSeat(seatNum);
            total += (s != null ? s.getBasePrice() : 4500.0);
        }
        return total;
    }

    public Booking cancelBooking(String bookingId) {
        Booking booking = repository.findBookingById(bookingId);
        if (booking == null) {
            throw new InvalidCancellationException("Booking not found: " + bookingId);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REFUNDED) {
            throw new InvalidCancellationException("Booking has already been cancelled.");
        }

        Flight flight = repository.findFlightById(booking.getFlightId());
        if (flight == null) {
            throw new FlightNotFoundException("Flight not found for booking: " + booking.getFlightId());
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(flight.getDepartureTime())) {
            throw new InvalidCancellationException("Cannot cancel booking for a flight that has already departed.");
        }

        // Calculate refund via the fare's Strategy — FLEXIBLE bookings get the tiered schedule,
        // BASIC bookings get nothing back, resolved by RefundPolicyFactory off the booking's fareType.
        double refund = refundPolicyFactory.forFareType(booking.getFareType())
                .calculateRefund(booking, flight.getDepartureTime(), now);
        booking.setRefundAmount(refund);
        booking.setStatus(refund > 0 ? BookingStatus.REFUNDED : BookingStatus.CANCELLED);
        booking.setCancelledAt(java.time.Instant.now());

        // Release seats back to AVAILABLE
        seatLockManager.releaseSeats(flight.getFlightId(), booking.getSeatNumbers(), flight);

        return booking;
    }

    public List<Booking> getUserBookings(String userId) {
        return repository.getBookingsByUser(userId);
    }

    public Booking getBooking(String bookingId) {
        Booking b = repository.findBookingById(bookingId);
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
        for (Flight flight : repository.getAllFlights()) {
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
        templates.add(SeatTemplate.builder().seatNumber("1A").seatClass(SeatClass.BUSINESS).window(true).aisle(false).build());
        templates.add(SeatTemplate.builder().seatNumber("1B").seatClass(SeatClass.BUSINESS).window(false).aisle(true).build());
        templates.add(SeatTemplate.builder().seatNumber("1C").seatClass(SeatClass.BUSINESS).window(false).aisle(true).build());
        templates.add(SeatTemplate.builder().seatNumber("1D").seatClass(SeatClass.BUSINESS).window(true).aisle(false).build());

        // Economy: 12A, 12B, 12C, 12D, 12E, 12F
        templates.add(SeatTemplate.builder().seatNumber("12A").seatClass(SeatClass.ECONOMY).window(true).aisle(false).build());
        templates.add(SeatTemplate.builder().seatNumber("12B").seatClass(SeatClass.ECONOMY).window(false).aisle(false).build());
        templates.add(SeatTemplate.builder().seatNumber("12C").seatClass(SeatClass.ECONOMY).window(false).aisle(true).build());
        templates.add(SeatTemplate.builder().seatNumber("12D").seatClass(SeatClass.ECONOMY).window(false).aisle(true).build());
        templates.add(SeatTemplate.builder().seatNumber("12E").seatClass(SeatClass.ECONOMY).window(false).aisle(false).build());
        templates.add(SeatTemplate.builder().seatNumber("12F").seatClass(SeatClass.ECONOMY).window(true).aisle(false).build());

        Aircraft simAircraft = Aircraft.of("Boeing 737-800", "SIM-VT-737", templates);

        LocalDateTime dep = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0);
        LocalDateTime arr = dep.plusHours(2).plusMinutes(15);
        Flight simFlight = Flight.create("SIM-AI-202", "AI202", "DEL", "BOM", dep, arr, simAircraft,
                pricingStrategyFactory.forModel(PricingModel.STANDARD));

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

    public synchronized Map<String, Object> simBook(String flightId, List<String> seatNumbers, String passengerName,
                                                     String userId, FareType fareType) {
        Flight flight = simFlightsById.get(flightId);
        if (flight == null) return getSimSnapshots();

        try {
            seatLockManager.confirmSeats(flightId, seatNumbers, userId, flight);

            double total = computeTotal(flight, seatNumbers);
            String bId = "SIM-BK-" + simBookingIdGen.getAndIncrement();
            List<Passenger> passengers = seatNumbers.stream()
                    .map(s -> Passenger.builder()
                            .passengerId("P-" + s)
                            .name(passengerName + " (" + s + ")")
                            .email("user@sim.com")
                            .passportOrId("A1234567")
                            .build())
                    .toList();

            Booking booking = Booking.builder()
                    .bookingId(bId)
                    .flightId(flightId)
                    .userId(userId)
                    .passengers(passengers)
                    .seatNumbers(seatNumbers)
                    .totalAmount(total)
                    .fareType(fareType != null ? fareType : FareType.FLEXIBLE)
                    .status(BookingStatus.CONFIRMED)
                    .build();
            simBookingsById.put(bId, booking);

            logSimEvent("BOOKING_CONFIRMED", userId,
                    String.format("Confirmed %s booking %s for seats %s (Total: ₹%.2f).",
                            booking.getFareType(), bId, seatNumbers, total),
                    Map.of("bookingId", bId, "seats", seatNumbers, "fareType", booking.getFareType().name()));
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

        double refund = refundPolicyFactory.forFareType(booking.getFareType())
                .calculateRefund(booking, flight.getDepartureTime(), cancelTime);
        booking.setRefundAmount(refund);
        booking.setStatus(refund > 0 ? BookingStatus.REFUNDED : BookingStatus.CANCELLED);
        booking.setCancelledAt(java.time.Instant.now());

        seatLockManager.releaseSeats(flight.getFlightId(), booking.getSeatNumbers(), flight);

        double pct = booking.getTotalAmount() > 0 ? (refund / booking.getTotalAmount()) * 100 : 0.0;
        logSimEvent("BOOKING_CANCELLED", booking.getUserId(),
                String.format("Cancelled %s (%s fare) at T-%d hours. Refund: ₹%.2f (%.0f%%). Seats %s released to AVAILABLE.",
                        bookingId, booking.getFareType(), hoursBeforeDeparture, refund, pct, booking.getSeatNumbers()),
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
        SimEvent event = SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(ts)
                .type(type)
                .actor(actor)
                .description(desc)
                .data(data)
                .build();
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
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "A").seatClass(SeatClass.BUSINESS).window(true).aisle(false).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "C").seatClass(SeatClass.BUSINESS).window(false).aisle(true).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "D").seatClass(SeatClass.BUSINESS).window(false).aisle(true).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "F").seatClass(SeatClass.BUSINESS).window(true).aisle(false).build());
        }
        // Row 3-15: Economy
        for (int r = 3; r <= 15; r++) {
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "A").seatClass(SeatClass.ECONOMY).window(true).aisle(false).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "B").seatClass(SeatClass.ECONOMY).window(false).aisle(false).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "C").seatClass(SeatClass.ECONOMY).window(false).aisle(true).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "D").seatClass(SeatClass.ECONOMY).window(false).aisle(true).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "E").seatClass(SeatClass.ECONOMY).window(false).aisle(false).build());
            b737Templates.add(SeatTemplate.builder().seatNumber(r + "F").seatClass(SeatClass.ECONOMY).window(true).aisle(false).build());
        }

        Aircraft ac1 = registerAircraft("Boeing 737-800", "VT-AXN", b737Templates);
        Aircraft ac2 = registerAircraft("Airbus A320neo", "VT-IND", b737Templates);

        LocalDateTime now = LocalDateTime.now();
        // AI-202 flies in 3 days: within the DEMAND_SURGE strategy's 3-14 day window, so its fares
        // demonstrably differ from the other two STANDARD-priced flights (see PricingStrategyFactory).
        createFlight("AI-202", "DEL", "BOM", now.plusDays(3).withHour(8).withMinute(0), now.plusDays(3).withHour(10).withMinute(15), ac1, PricingModel.DEMAND_SURGE);
        createFlight("6E-505", "BOM", "BLR", now.plusDays(3).withHour(14).withMinute(30), now.plusDays(3).withHour(16).withMinute(15), ac2, PricingModel.STANDARD);
        createFlight("UK-818", "DEL", "BLR", now.plusDays(4).withHour(18).withMinute(0), now.plusDays(4).withHour(20).withMinute(45), ac1, PricingModel.STANDARD);
    }
}

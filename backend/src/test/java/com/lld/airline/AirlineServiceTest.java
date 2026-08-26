package com.lld.airline;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.FareType;
import com.lld.airline.enums.PricingModel;
import com.lld.airline.enums.SeatClass;
import com.lld.airline.enums.SeatStatus;
import com.lld.airline.exception.BookingFailedException;
import com.lld.airline.exception.HoldExpiredException;
import com.lld.airline.exception.InvalidCancellationException;
import com.lld.airline.exception.SeatNotAvailableException;
import com.lld.airline.model.Aircraft;
import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Passenger;
import com.lld.airline.model.Seat;
import com.lld.airline.model.SeatTemplate;
import com.lld.airline.repository.AirlineRepository;
import com.lld.airline.service.AirlineService;
import com.lld.airline.service.PaymentProcessor;
import com.lld.airline.service.SeatLockManager;
import com.lld.airline.strategy.ClassBasedPricingStrategy;
import com.lld.airline.strategy.DemandSurgePricingStrategy;
import com.lld.airline.strategy.NonRefundableFarePolicy;
import com.lld.airline.strategy.PricingStrategyFactory;
import com.lld.airline.strategy.RefundPolicyFactory;
import com.lld.airline.strategy.TieredCancellationRefundPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AirlineServiceTest {

    private AirlineService service;
    private RefundPolicyFactory refundPolicyFactory;
    private PricingStrategyFactory pricingStrategyFactory;

    @BeforeEach
    void setUp() {
        SeatLockManager lockManager = new SeatLockManager();
        PaymentProcessor paymentProcessor = new PaymentProcessor();
        refundPolicyFactory = new RefundPolicyFactory(new TieredCancellationRefundPolicy(), new NonRefundableFarePolicy());
        pricingStrategyFactory = new PricingStrategyFactory(new ClassBasedPricingStrategy(), new DemandSurgePricingStrategy());
        service = new AirlineService(new AirlineRepository(), lockManager, paymentProcessor, refundPolicyFactory, pricingStrategyFactory);
    }

    private static Passenger passenger(String id, String name, String email, String doc) {
        return Passenger.builder().passengerId(id).name(name).email(email).passportOrId(doc).build();
    }

    @Test
    void testFlightCreationAndSearch() {
        List<Flight> flights = service.getAllFlights();
        assertFalse(flights.isEmpty());

        List<Flight> searchResults = service.searchFlights("DEL", "BOM", null);
        assertFalse(searchResults.isEmpty());
        assertEquals("DEL", searchResults.get(0).getSource());
        assertEquals("BOM", searchResults.get(0).getDestination());
    }

    @Test
    void testSeatHoldAndBookingSuccess() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String userId = "user-alice";

        // Hold 2 seats
        service.holdSeats(flightId, List.of("12A", "12B"), userId);
        assertEquals(SeatStatus.HELD, flight.getSeat("12A").getStatus());
        assertEquals(SeatStatus.HELD, flight.getSeat("12B").getStatus());

        // Book held seats
        List<Passenger> passengers = List.of(
                passenger("P1", "Alice Vance", "alice@example.com", "P123456"),
                passenger("P2", "Bob Vance", "bob@example.com", "P654321")
        );

        Booking booking = service.bookFlight(flightId, List.of("12A", "12B"), passengers, userId, "CARD", "IDEMP-1");
        assertNotNull(booking);
        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        assertEquals(SeatStatus.BOOKED, flight.getSeat("12A").getStatus());
        assertEquals(SeatStatus.BOOKED, flight.getSeat("12B").getStatus());
    }

    @Test
    void testLastSeatCollisionRace() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();

        // User 1 holds seat 12C
        service.holdSeats(flightId, List.of("12C"), "user-1");

        // User 2 attempts to hold the same seat -> must throw SeatNotAvailableException
        assertThrows(SeatNotAvailableException.class, () -> {
            service.holdSeats(flightId, List.of("12C"), "user-2");
        });
    }

    @Test
    void testMultiSeatAtomicRollbackOnCollision() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();

        // Hold seat 12D for User 1
        service.holdSeats(flightId, List.of("12D"), "user-1");

        // User 2 attempts to hold {"12E", "12D"} (12E is free, 12D is held)
        assertThrows(SeatNotAvailableException.class, () -> {
            service.holdSeats(flightId, List.of("12E", "12D"), "user-2");
        });

        // 12E must NOT remain held by User 2 (atomic rollback)
        assertEquals(SeatStatus.AVAILABLE, flight.getSeat("12E").getStatus());
    }

    @Test
    void testHoldExpiryAtCommit() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String userId = "user-slow";

        service.holdSeats(flightId, List.of("12F"), userId);
        Seat seat = flight.getSeat("12F");

        // Force expiration by setting holdExpiresAt to the past
        seat.setHoldExpiresAt(System.currentTimeMillis() - 10000L);

        List<Passenger> passengers = List.of(passenger("P1", "Slow User", "slow@example.com", "ID1"));
        assertThrows(HoldExpiredException.class, () -> {
            service.bookFlight(flightId, List.of("12F"), passengers, userId, "CARD", "IDEMP-EXP");
        });
    }

    @Test
    void testOverbookingRejectedWhenSeatAlreadyBooked() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();

        service.holdSeats(flightId, List.of("5A"), "user-first");
        service.bookFlight(flightId, List.of("5A"), List.of(passenger("P1", "First", "f@x.com", "ID1")), "user-first", "CARD", "IDEMP-OB1");
        assertEquals(SeatStatus.BOOKED, flight.getSeat("5A").getStatus());

        // A second passenger can never even acquire a hold on an already-BOOKED seat
        assertThrows(SeatNotAvailableException.class, () ->
                service.holdSeats(flightId, List.of("5A"), "user-second"));

        // Nor can they bypass the hold and confirm directly against a booked seat — this must reject
        // as SeatNotAvailable, and critically must NOT reset seat 5A back to AVAILABLE (RCA-024).
        assertThrows(SeatNotAvailableException.class, () ->
                service.bookFlight(flightId, List.of("5A"), List.of(passenger("P2", "Second", "s@x.com", "ID2")),
                        "user-second", "CARD", "IDEMP-OB2"));
        assertEquals(SeatStatus.BOOKED, flight.getSeat("5A").getStatus());
    }

    @Test
    void testCancellationAndRefundTiers() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String userId = "user-cancel";

        service.holdSeats(flightId, List.of("3A"), userId);
        List<Passenger> passengers = List.of(passenger("P1", "Cancel User", "c@example.com", "ID"));
        Booking booking = service.bookFlight(flightId, List.of("3A"), passengers, userId, "CARD", "IDEMP-C");

        // Default fare is FLEXIBLE -> cancel booking >24h before departure gets a full refund
        assertEquals(FareType.FLEXIBLE, booking.getFareType());
        Booking cancelled = service.cancelBooking(booking.getBookingId());
        assertEquals(BookingStatus.REFUNDED, cancelled.getStatus());
        assertEquals(booking.getTotalAmount(), cancelled.getRefundAmount());
        assertEquals(SeatStatus.AVAILABLE, flight.getSeat("3A").getStatus());

        // Second cancellation throws InvalidCancellationException
        assertThrows(InvalidCancellationException.class, () -> {
            service.cancelBooking(booking.getBookingId());
        });
    }

    @Test
    void testBasicFareIsNonRefundableEvenWellBeforeDeparture() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String userId = "user-basic";

        service.holdSeats(flightId, List.of("4A"), userId);
        List<Passenger> passengers = List.of(passenger("P1", "Basic Fare User", "b@example.com", "ID-B"));
        Booking booking = service.bookFlight(flightId, List.of("4A"), passengers, userId, "CARD", "IDEMP-BASIC", FareType.BASIC);

        // Cancelling >24h out still yields zero refund for a BASIC fare
        Booking cancelled = service.cancelBooking(booking.getBookingId());
        assertEquals(BookingStatus.CANCELLED, cancelled.getStatus());
        assertEquals(0.0, cancelled.getRefundAmount());
        assertEquals(SeatStatus.AVAILABLE, flight.getSeat("4A").getStatus());
    }

    @Test
    void testPricingStrategyIsActuallyUsedForSeatPrices() {
        // ClassBasedPricingStrategy: FIRST=5x, BUSINESS=3x, PREMIUM_ECONOMY=1.5x, ECONOMY=1x of base (4500)
        Flight flight = service.getAllFlights().get(0);
        Seat business = flight.getSeat("1A"); // row 1-2 are BUSINESS on the seeded 737 layout
        Seat economy = flight.getSeat("12A");
        assertNotNull(business);
        assertNotNull(economy);
        assertEquals(SeatClass.BUSINESS, business.getSeatClass());
        assertEquals(SeatClass.ECONOMY, economy.getSeatClass());
        // Business must price strictly above economy — proves per-class strategy pricing is wired,
        // not a flat/duplicated hardcoded price.
        assertTrue(business.getBasePrice() > economy.getBasePrice());
    }

    @Test
    void testDemandSurgePricingModelPricesAboveStandardForSameSeatClass() {
        Aircraft aircraft = Aircraft.of("Test-737", "TEST-TAIL", List.of(
                SeatTemplate.builder().seatNumber("1A").seatClass(SeatClass.ECONOMY).window(true).aisle(false).build()));

        LocalDateTime departureSoon = LocalDateTime.now().plusDays(5); // inside the 3-14 day surge window
        Flight standardFlight = Flight.create("STD-1", "STD-1", "DEL", "BOM", departureSoon, departureSoon.plusHours(2),
                aircraft, pricingStrategyFactory.forModel(PricingModel.STANDARD));
        Flight surgeFlight = Flight.create("SURGE-1", "SURGE-1", "DEL", "BOM", departureSoon, departureSoon.plusHours(2),
                aircraft, pricingStrategyFactory.forModel(PricingModel.DEMAND_SURGE));

        assertTrue(surgeFlight.getSeat("1A").getBasePrice() > standardFlight.getSeat("1A").getBasePrice());
    }

    @Test
    void testBookingFailsWhenSeatAndPassengerCountsMismatch() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        service.holdSeats(flightId, List.of("6A"), "user-mismatch");

        assertThrows(BookingFailedException.class, () ->
                service.bookFlight(flightId, List.of("6A"),
                        List.of(passenger("P1", "A", "a@x.com", "ID1"), passenger("P2", "B", "b@x.com", "ID2")),
                        "user-mismatch", "CARD", "IDEMP-MISMATCH"));
    }

    @Test
    void testSimulationEngine() {
        service.simReset();
        Map<String, Object> snapshots = service.getSimSnapshots();
        assertNotNull(snapshots);
        assertTrue(snapshots.containsKey("flights"));
        assertTrue(snapshots.containsKey("events"));

        // Hold in simulation
        Map<String, Object> afterHold = service.simHold("SIM-AI-202", List.of("12A"), "Sim-Alice");
        assertNotNull(afterHold);

        // Book in simulation
        Map<String, Object> afterBook = service.simBook("SIM-AI-202", List.of("12A"), "Alice", "Sim-Alice", FareType.FLEXIBLE);
        assertNotNull(afterBook);

        // Expire in simulation
        Map<String, Object> afterExpire = service.simExpireHold("SIM-AI-202");
        assertNotNull(afterExpire);

        assertFalse(service.getSimEvents().isEmpty());
    }

    @Test
    void testSimCancelHonoursFareTypeRefundPolicy() {
        service.simReset();
        service.simHold("SIM-AI-202", List.of("12B"), "Sim-Bob");
        Map<String, Object> afterBook = service.simBook("SIM-AI-202", List.of("12B"), "Bob", "Sim-Bob", FareType.BASIC);
        @SuppressWarnings("unchecked")
        var bookings = (java.util.Collection<Booking>) afterBook.get("bookings");
        Booking basicBooking = bookings.stream().filter(b -> b.getUserId().equals("Sim-Bob")).findFirst().orElseThrow();

        Map<String, Object> afterCancel = service.simCancel(basicBooking.getBookingId(), 48); // 48h out, well within 24h+ window
        assertNotNull(afterCancel);
        assertEquals(0.0, basicBooking.getRefundAmount()); // BASIC fare never refunds regardless of notice
    }
}

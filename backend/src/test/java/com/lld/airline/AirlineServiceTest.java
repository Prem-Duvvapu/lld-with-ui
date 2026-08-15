package com.lld.airline;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.SeatStatus;
import com.lld.airline.exception.HoldExpiredException;
import com.lld.airline.exception.InvalidCancellationException;
import com.lld.airline.exception.SeatNotAvailableException;
import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Passenger;
import com.lld.airline.model.Seat;
import com.lld.airline.service.AirlineService;
import com.lld.airline.service.PaymentProcessor;
import com.lld.airline.service.SeatLockManager;
import com.lld.airline.strategy.ClassBasedPricingStrategy;
import com.lld.airline.strategy.TieredCancellationRefundPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AirlineServiceTest {

    private AirlineService service;

    @BeforeEach
    void setUp() {
        SeatLockManager lockManager = new SeatLockManager();
        PaymentProcessor paymentProcessor = new PaymentProcessor();
        TieredCancellationRefundPolicy refundPolicy = new TieredCancellationRefundPolicy();
        ClassBasedPricingStrategy pricingStrategy = new ClassBasedPricingStrategy();
        service = new AirlineService(lockManager, paymentProcessor, refundPolicy, pricingStrategy);
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
                new Passenger("P1", "Alice Vance", "alice@example.com", "P123456"),
                new Passenger("P2", "Bob Vance", "bob@example.com", "P654321")
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

        List<Passenger> passengers = List.of(new Passenger("P1", "Slow User", "slow@example.com", "ID1"));
        assertThrows(HoldExpiredException.class, () -> {
            service.bookFlight(flightId, List.of("12F"), passengers, userId, "CARD", "IDEMP-EXP");
        });
    }

    @Test
    void testCancellationAndRefundTiers() {
        Flight flight = service.getAllFlights().get(0);
        String flightId = flight.getFlightId();
        String userId = "user-cancel";

        service.holdSeats(flightId, List.of("3A"), userId);
        List<Passenger> passengers = List.of(new Passenger("P1", "Cancel User", "c@example.com", "ID"));
        Booking booking = service.bookFlight(flightId, List.of("3A"), passengers, userId, "CARD", "IDEMP-C");

        // Cancel booking >24h before departure
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
        Map<String, Object> afterBook = service.simBook("SIM-AI-202", List.of("12A"), "Alice", "Sim-Alice");
        assertNotNull(afterBook);

        // Expire in simulation
        Map<String, Object> afterExpire = service.simExpireHold("SIM-AI-202");
        assertNotNull(afterExpire);

        assertFalse(service.getSimEvents().isEmpty());
    }
}

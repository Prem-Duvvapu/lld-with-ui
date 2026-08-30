package com.lld.hotel;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.ReservationStatus;
import com.lld.hotel.model.SimEvent;
import com.lld.hotel.repository.HotelRepository;
import com.lld.hotel.service.HotelService;
import com.lld.hotel.service.RoomBookingService;
import com.lld.hotel.strategy.CancellationRefundStrategyFactory;
import com.lld.hotel.strategy.FullRefundStrategy;
import com.lld.hotel.strategy.NoRefundStrategy;
import com.lld.hotel.strategy.PartialRefundStrategy;
import com.lld.hotel.strategy.StandardTariffStrategy;
import com.lld.hotel.strategy.TariffStrategyFactory;
import com.lld.hotel.strategy.WeekendTariffStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers the isolated {@code /api/hotel/sim/*} engine added to close the gap RCA-039 flagged:
 * hotel had no simulation sandbox at all, unlike every other reference-bar module. These tests
 * exercise {@link HotelService}'s sim methods directly rather than through MockMvc, mirroring the
 * style of {@code HotelServiceTest}.
 */
@DisplayName("Hotel Simulation Sandbox")
class HotelSimTest {

    private HotelService service;

    @BeforeEach
    void setUp() {
        HotelRepository repository = new HotelRepository();
        TariffStrategyFactory tariffStrategyFactory =
                new TariffStrategyFactory(new StandardTariffStrategy(), new WeekendTariffStrategy());
        CancellationRefundStrategyFactory refundStrategyFactory = new CancellationRefundStrategyFactory(
                new FullRefundStrategy(), new PartialRefundStrategy(), new NoRefundStrategy());
        RoomBookingService bookingService =
                new RoomBookingService(repository, tariffStrategyFactory, refundStrategyFactory);
        service = new HotelService(repository, bookingService);
        service.simReset();
    }

    @Test
    @DisplayName("simReset seeds a fresh sandbox and clears the event log")
    void simResetSeedsFreshState() {
        Map<String, Object> state = service.simState();
        assertEquals(2, ((List<?>) state.get("hotels")).size());
        assertEquals(10, ((List<?>) state.get("rooms")).size());
        assertTrue(((List<?>) state.get("bookings")).isEmpty());

        List<SimEvent> events = service.simEvents();
        assertEquals(1, events.size());
        assertEquals("RESET", events.get(0).getEventType());
    }

    @Test
    @DisplayName("simReset run twice always leaves exactly the RESET event behind, not an accumulating log")
    void simResetClearsPriorEvents() {
        service.simBook("R1", "sim-user-1", "Alice", LocalDate.now().plusDays(1), LocalDate.now().plusDays(2));
        assertTrue(service.simEvents().size() >= 2);

        service.simReset();
        assertEquals(1, service.simEvents().size());
    }

    @Test
    @DisplayName("simBook prices via the real TariffStrategy and logs a BOOKED event")
    void simBookPricesAndLogs() {
        LocalDate ci = LocalDate.now().plusDays(1);
        LocalDate co = LocalDate.now().plusDays(3);

        Booking booking = service.simBook("R1", "sim-user-1", "Alice", ci, co);

        assertEquals(ReservationStatus.CONFIRMED, booking.getStatus());
        assertNotNull(booking.getTariffStrategyName());
        assertTrue(booking.getTotalAmount() > 0);

        List<SimEvent> events = service.simEvents();
        SimEvent last = events.get(events.size() - 1);
        assertEquals("BOOKED", last.getEventType());
        assertEquals("Alice", last.getActor());
    }

    @Test
    @DisplayName("simCheckIn and simCheckOut transition the sim booking and log events")
    void simCheckInCheckOutLifecycle() {
        Booking booking = service.simBook("R2", "sim-user-2", "Bob",
                LocalDate.now().plusDays(1), LocalDate.now().plusDays(2));

        Booking checkedIn = service.simCheckIn(booking.getId(), "Bob");
        assertEquals(ReservationStatus.CHECKED_IN, checkedIn.getStatus());

        Booking checkedOut = service.simCheckOut(booking.getId(), "Bob");
        assertEquals(ReservationStatus.CHECKED_OUT, checkedOut.getStatus());

        List<String> eventTypes = service.simEvents().stream().map(SimEvent::getEventType).toList();
        assertTrue(eventTypes.contains("CHECKED_IN"));
        assertTrue(eventTypes.contains("CHECKED_OUT"));
    }

    @Test
    @DisplayName("simCancel resolves a refund via CancellationRefundStrategy and logs it")
    void simCancelResolvesRefund() {
        LocalDate ci = LocalDate.now().plusDays(10);
        LocalDate co = LocalDate.now().plusDays(12);
        Booking booking = service.simBook("R3", "sim-user-3", "Carol", ci, co);

        Booking cancelled = service.simCancel(booking.getId(), "Carol");

        assertEquals(ReservationStatus.CANCELLED, cancelled.getStatus());
        // 10+ days out is well past the 3-day full-refund threshold.
        assertEquals(cancelled.getTotalAmount(), cancelled.getRefundAmount());
        assertNotNull(cancelled.getRefundReason());

        List<SimEvent> events = service.simEvents();
        SimEvent last = events.get(events.size() - 1);
        assertEquals("CANCELLED", last.getEventType());
    }

    @Test
    @DisplayName("simRace: exactly one of several concurrent guests wins the same room/date range, the rest are rejected")
    void simRaceProducesExactlyOneWinner() {
        LocalDate ci = LocalDate.now().plusDays(5);
        LocalDate co = LocalDate.now().plusDays(7);

        Map<String, Object> result = service.simRace("R4", ci, co, 5);

        assertEquals(5, result.get("attempts"));
        assertFalse("none".equals(result.get("winner")));
        assertEquals(4L, result.get("rejected"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) result.get("results");
        long wonCount = results.stream().filter(r -> "WON".equals(r.get("outcome"))).count();
        assertEquals(1, wonCount);

        // The race must have produced exactly one CONFIRMED booking for the room — not zero, not two.
        Map<String, Object> state = service.simState();
        @SuppressWarnings("unchecked")
        List<Booking> bookings = (List<Booking>) (List<?>) state.get("bookings");
        long confirmedForRoom = bookings.stream()
                .filter(b -> "R4".equals(b.getRoomId()) && b.getStatus() == ReservationStatus.CONFIRMED)
                .count();
        assertEquals(1, confirmedForRoom);
    }

    @Test
    @DisplayName("simRace clamps an out-of-range guest count into [2, 8]")
    void simRaceClampsGuestCount() {
        LocalDate ci = LocalDate.now().plusDays(20);
        LocalDate co = LocalDate.now().plusDays(21);

        Map<String, Object> result = service.simRace("R5", ci, co, 100);
        assertEquals(8, result.get("attempts"));

        Map<String, Object> result2 = service.simRace("R6", ci, co, 1);
        assertEquals(2, result2.get("attempts"));
    }
}

package com.lld.parkinglot;

import com.lld.parkinglot.exception.SpotNotAvailableException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.exception.TicketNotFoundException;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.SimEvent;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.service.ParkingLotSimService;
import com.lld.parkinglot.strategy.FarthestSpotStrategy;
import com.lld.parkinglot.strategy.FlatRatePricingStrategy;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.DynamicPricingStrategy;
import com.lld.parkinglot.strategy.NearestSpotStrategy;
import com.lld.parkinglot.strategy.PricingStrategyFactory;
import com.lld.parkinglot.strategy.SpotAssignmentStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** The isolated /sim/* sandbox: its own seed data, its own event log, never touching the live repository. */
class ParkingLotSimServiceTest {

    private ParkingLotSimService sim;

    @BeforeEach
    void setUp() {
        sim = new ParkingLotSimService(
                new SpotAssignmentStrategyFactory(new NearestSpotStrategy(), new FarthestSpotStrategy()),
                new PricingStrategyFactory(new HourlyPricingStrategy(), new FlatRatePricingStrategy(), new DynamicPricingStrategy()));
    }

    @Test
    void reset_seedsTenSpotsAndLogsAResetEvent() {
        Map<String, Object> state = sim.reset();
        @SuppressWarnings("unchecked")
        List<ParkingSpot> spots = (List<ParkingSpot>) state.get("spots");
        assertEquals(10, spots.size());
        assertTrue(spots.stream().noneMatch(ParkingSpot::isOccupied));

        List<SimEvent> events = sim.getEvents();
        assertEquals(1, events.size());
        assertEquals("SIM_RESET", events.get(0).getEventType());
    }

    @Test
    void entry_assignsASpotAndIssuesASimTicket() {
        Map<String, Object> state = sim.entry("SIM-CAR-1", "CAR", "NEAREST");
        @SuppressWarnings("unchecked")
        List<Ticket> active = (List<Ticket>) state.get("activeTickets");
        assertEquals(1, active.size());
        assertTrue(active.get(0).getTicketNumber().startsWith("SIM-TKT-"));
        assertEquals("SIM-CAR-1", active.get(0).getVehicleNumber());
    }

    @Test
    void entry_throwsWhenSandboxTypeIsFull() {
        for (int i = 0; i < 4; i++) {
            sim.entry("V" + i, "CAR", "NEAREST");
        }
        assertThrows(SpotNotAvailableException.class, () -> sim.entry("ONE-TOO-MANY", "CAR", "NEAREST"));
    }

    @Test
    void scan_thenPay_releasesTheSpotAndMarksTicketPaid() {
        sim.entry("SIM-CAR-2", "CAR", "NEAREST");
        String ticketNumber = "SIM-TKT-00001";

        Map<String, Object> scanResult = sim.scan(ticketNumber, "FLAT");
        assertEquals(50.0, (Double) scanResult.get("previewAmount"));

        Map<String, Object> payResult = sim.pay(ticketNumber, "FLAT", "UPI");
        @SuppressWarnings("unchecked")
        List<Ticket> active = (List<Ticket>) payResult.get("activeTickets");
        assertTrue(active.isEmpty());

        @SuppressWarnings("unchecked")
        List<ParkingSpot> spots = (List<ParkingSpot>) payResult.get("spots");
        assertTrue(spots.stream().noneMatch(ParkingSpot::isOccupied));
    }

    @Test
    void pay_throwsForUnknownTicket() {
        assertThrows(TicketNotFoundException.class, () -> sim.pay("SIM-TKT-99999", "HOURLY", "CASH"));
    }

    @Test
    void pay_throwsOnDoublePay() {
        sim.entry("SIM-CAR-3", "CAR", "NEAREST");
        sim.pay("SIM-TKT-00001", "HOURLY", "CASH");
        assertThrows(TicketAlreadyExitedException.class, () -> sim.pay("SIM-TKT-00001", "HOURLY", "CASH"));
    }

    @Test
    void reset_clearsPriorTicketsAndEvents() {
        sim.entry("SIM-CAR-4", "CAR", "NEAREST");
        sim.reset();
        assertTrue(sim.getEvents().size() == 1, "Reset should clear the event log down to its own SIM_RESET entry");
        Map<String, Object> state = sim.getState();
        @SuppressWarnings("unchecked")
        List<Ticket> active = (List<Ticket>) state.get("activeTickets");
        assertTrue(active.isEmpty());
    }
}

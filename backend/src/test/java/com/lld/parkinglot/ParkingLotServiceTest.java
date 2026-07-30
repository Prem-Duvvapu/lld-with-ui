package com.lld.parkinglot;

import com.lld.parkinglot.config.ParkingLotInitializer;
import com.lld.parkinglot.model.*;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.service.ParkingLotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ParkingLotServiceTest {

    private ParkingLotService service;
    private ParkingLotRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ParkingLotRepository();
        service = new ParkingLotService(repository);
        new ParkingLotInitializer(repository).run();
    }

    @Test
    void entry_shouldReturnTicketWithCorrectDetails() {
        Ticket ticket = service.entry("G1", "KA-01-AB-1234", "CAR");
        assertNotNull(ticket);
        assertTrue(ticket.getTicketNumber().startsWith("TKT-"));
        assertEquals("KA-01-AB-1234", ticket.getVehicleNumber());
        assertEquals(VehicleType.CAR, ticket.getVehicleType());
        assertNotNull(ticket.getSpotId());
        assertTrue(ticket.getSpotId().startsWith("F1-C"));
        assertNotNull(ticket.getEntryTime());
        assertNull(ticket.getExitTime());
        assertEquals(0.0, ticket.getAmount());
    }

    @Test
    void entry_shouldAssignSpotAndMarkItOccupied() {
        Ticket ticket = service.entry("G1", "KA-01-1234", "CAR");
        ParkingSpot spot = repository.getSpot(ticket.getSpotId());
        assertNotNull(spot);
        assertTrue(spot.isOccupied());
    }

    @Test
    void entry_shouldThrowForInvalidGate() {
        Exception e = assertThrows(IllegalArgumentException.class, () -> service.entry("NONEXIST", "KA-01", "CAR"));
        assertTrue(e.getMessage().contains("Invalid gate"));
    }

    @Test
    void entry_shouldThrowForExitGate() {
        Exception e = assertThrows(IllegalArgumentException.class, () -> service.entry("G3", "KA-01", "CAR"));
        assertTrue(e.getMessage().contains("Not an entry gate"));
    }

    @Test
    void entry_shouldThrowWhenNoSpotsAvailable() {
        fillAllSpots("CAR");
        Exception e = assertThrows(IllegalStateException.class, () -> service.entry("G1", "KA-01", "CAR"));
        assertTrue(e.getMessage().contains("No available spot"));
    }

    @Test
    void exit_shouldCalculateAmountAndReleaseSpot() {
        Ticket ticket = service.entry("G1", "KA-01-AB-1234", "CAR");
        String spotId = ticket.getSpotId();

        Ticket receipt = service.exit("G3", ticket.getTicketNumber());

        assertNotNull(receipt.getExitTime());
        assertTrue(receipt.getAmount() > 0, "Amount should be > 0");
        assertFalse(repository.getSpot(spotId).isOccupied(), "Spot should be released");
    }

    @Test
    void exit_shouldThrowForInvalidTicket() {
        Exception e = assertThrows(IllegalArgumentException.class, () -> service.exit("G3", "INVALID"));
        assertTrue(e.getMessage().contains("Invalid ticket"));
    }

    @Test
    void exit_shouldThrowForEntryGate() {
        Ticket ticket = service.entry("G1", "KA-01", "CAR");
        Exception e = assertThrows(IllegalArgumentException.class, () -> service.exit("G1", ticket.getTicketNumber()));
        assertTrue(e.getMessage().contains("Not an exit gate"));
    }

    @Test
    void exit_shouldThrowForDoubleExit() {
        Ticket ticket = service.entry("G1", "KA-01", "CAR");
        service.exit("G3", ticket.getTicketNumber());
        Exception e = assertThrows(IllegalStateException.class, () -> service.exit("G3", ticket.getTicketNumber()));
        assertTrue(e.getMessage().contains("already used"));
    }

    @Test
    void getGates_shouldReturnAllGates() {
        List<Gate> gates = service.getGates();
        assertEquals(4, gates.size());
    }

    @Test
    void getActiveTickets_shouldReturnOnlyActiveTickets() {
        service.entry("G1", "V1", "CAR");
        Ticket t2 = service.entry("G1", "V2", "BIKE");
        service.exit("G3", t2.getTicketNumber());

        List<Ticket> active = service.getActiveTickets();
        assertEquals(1, active.size());
        assertEquals("V1", active.get(0).getVehicleNumber());
    }

    @Test
    void entry_withDifferentVehicleTypes() {
        Ticket carTicket = service.entry("G1", "CAR-1", "CAR");
        assertTrue(carTicket.getSpotId().contains("-C"));

        Ticket bikeTicket = service.entry("G1", "BIKE-1", "BIKE");
        assertTrue(bikeTicket.getSpotId().contains("-B"));

        Ticket truckTicket = service.entry("G1", "TRUCK-1", "TRUCK");
        assertTrue(truckTicket.getSpotId().contains("-T"));
    }

    @Test
    void getAvailableSpots_shouldReturnCorrectCount() {
        List<ParkingSpot> before = service.getAvailableSpots();
        service.entry("G1", "V1", "CAR");
        List<ParkingSpot> after = service.getAvailableSpots();
        assertEquals(before.size() - 1, after.size());
    }

    @Test
    void getAvailableSpotsByType_shouldFilterCorrectly() {
        List<ParkingSpot> carSpots = service.getAvailableSpotsByType("CAR");
        assertTrue(carSpots.stream().allMatch(s -> s.getVehicleType() == VehicleType.CAR));
    }

    @Test
    void entry_withNearestStrategy_shouldPickLowestFloorAndSpot() {
        Ticket ticket = service.entry("G1", "CAR-NEAREST", "CAR", "NEAREST");
        assertEquals("F1-C1", ticket.getSpotId());
    }

    @Test
    void entry_withFarthestStrategy_shouldPickHighestFloorAndSpot() {
        Ticket ticket = service.entry("G1", "CAR-FARTHEST", "CAR", "FARTHEST");
        assertEquals("F3-C4", ticket.getSpotId());
    }

    private void fillAllSpots(String type) {
        while (true) {
            try {
                service.entry("G1", "FILL", type);
            } catch (IllegalStateException e) {
                break;
            }
        }
    }
}

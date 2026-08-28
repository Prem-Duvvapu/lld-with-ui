package com.lld.parkinglot;

import com.lld.parkinglot.config.ParkingLotInitializer;
import com.lld.parkinglot.exception.GateNotFoundException;
import com.lld.parkinglot.exception.InvalidGateTypeException;
import com.lld.parkinglot.exception.SpotNotAvailableException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.exception.TicketNotFoundException;
import com.lld.parkinglot.exception.VehicleTypeNotSupportedException;
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
        GateNotFoundException e = assertThrows(GateNotFoundException.class, () -> service.entry("NONEXIST", "KA-01", "CAR"));
        assertTrue(e.getMessage().contains("NONEXIST"));
    }

    @Test
    void entry_shouldThrowForExitGate() {
        InvalidGateTypeException e = assertThrows(InvalidGateTypeException.class, () -> service.entry("G3", "KA-01", "CAR"));
        assertTrue(e.getMessage().contains("ENTRY"));
    }

    @Test
    void entry_shouldThrowForUnknownVehicleType() {
        VehicleTypeNotSupportedException e = assertThrows(VehicleTypeNotSupportedException.class,
                () -> service.entry("G1", "KA-01", "SPACESHIP"));
        assertTrue(e.getMessage().contains("SPACESHIP"));
    }

    @Test
    void entry_shouldThrowWhenNoSpotsAvailable() {
        fillAllSpots("CAR");
        SpotNotAvailableException e = assertThrows(SpotNotAvailableException.class, () -> service.entry("G1", "KA-01", "CAR"));
        assertTrue(e.getMessage().contains("CAR"));
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
    void exit_withFlatRatePricing_shouldCalculateFlatAmount() {
        Ticket ticket = service.entry("G1", "CAR-FLAT", "CAR");
        Ticket receipt = service.exit("G3", ticket.getTicketNumber(), "FLAT");
        assertEquals(50.0, receipt.getAmount());
    }

    @Test
    void exit_withDynamicPricing_shouldApplySurcharge() {
        Ticket ticket = service.entry("G1", "CAR-DYNAMIC", "CAR");
        Ticket receipt = service.exit("G3", ticket.getTicketNumber(), "DYNAMIC");
        assertEquals(30.0, receipt.getAmount());
    }

    @Test
    void exit_shouldThrowForInvalidTicket() {
        TicketNotFoundException e = assertThrows(TicketNotFoundException.class, () -> service.exit("G3", "INVALID"));
        assertTrue(e.getMessage().contains("INVALID"));
    }

    @Test
    void exit_shouldThrowForEntryGate() {
        Ticket ticket = service.entry("G1", "KA-01", "CAR");
        InvalidGateTypeException e = assertThrows(InvalidGateTypeException.class, () -> service.exit("G1", ticket.getTicketNumber()));
        assertTrue(e.getMessage().contains("EXIT"));
    }

    @Test
    void exit_shouldThrowForDoubleExit() {
        Ticket ticket = service.entry("G1", "KA-01", "CAR");
        service.exit("G3", ticket.getTicketNumber());
        TicketAlreadyExitedException e = assertThrows(TicketAlreadyExitedException.class, () -> service.exit("G3", ticket.getTicketNumber()));
        assertTrue(e.getMessage().contains(ticket.getTicketNumber()));
    }

    @Test
    void scanTicket_shouldThrowForAlreadyPaidTicket() {
        Ticket ticket = service.entry("G1", "KA-01", "CAR");
        service.exit("G3", ticket.getTicketNumber());
        assertThrows(TicketAlreadyExitedException.class, () -> service.scanTicket("G3", ticket.getTicketNumber(), "HOURLY"));
    }

    @Test
    void scanTicket_shouldNotReleaseSpotOrMutateLiveTicket() {
        Ticket ticket = service.entry("G1", "KA-01", "CAR");
        Ticket preview = service.scanTicket("G3", ticket.getTicketNumber(), "HOURLY");

        assertTrue(preview.getAmount() > 0);
        assertEquals(Ticket.PaymentStatus.UNPAID, preview.getPaymentStatus());
        assertTrue(repository.getSpot(ticket.getSpotId()).isOccupied(), "Spot must remain occupied after a scan preview");
        assertNull(repository.getTicket(ticket.getTicketNumber()).getExitTime(), "Live ticket must be untouched by a scan preview");
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
            } catch (SpotNotAvailableException e) {
                break;
            }
        }
    }
}

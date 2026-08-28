package com.lld.parkinglot;

import com.lld.parkinglot.exception.SpotNotFoundException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.exception.TicketNotFoundException;
import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.Gate;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.strategy.NearestSpotStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Exercises the repository's own behaviour independently of the service — the locking
 * discipline in {@code occupySpot}/{@code completeExit}, ticket-number sequencing, and active
 * ticket sorting are real logic, not a bare id/save/get wrapper.
 */
class ParkingLotRepositoryTest {

    private ParkingLotRepository repository;
    private final NearestSpotStrategy nearest = new NearestSpotStrategy();

    @BeforeEach
    void setUp() {
        repository = new ParkingLotRepository();
        repository.addFloor(new Floor(1, List.of(
                new ParkingSpot("F1-C1", 1, 1, VehicleType.CAR),
                new ParkingSpot("F1-C2", 1, 2, VehicleType.CAR)
        )));
        repository.addGate(new Gate("G1", "Entry", Gate.GateType.ENTRY));
    }

    @Test
    void occupySpot_picksViaStrategyAndMarksOccupied() {
        ParkingSpot spot = repository.occupySpot(VehicleType.CAR, nearest);
        assertEquals("F1-C1", spot.getId());
        assertTrue(repository.getSpot("F1-C1").isOccupied());
    }

    @Test
    void occupySpot_returnsNullWhenNoneAvailable() {
        repository.occupySpot(VehicleType.CAR, nearest);
        repository.occupySpot(VehicleType.CAR, nearest);
        assertNull(repository.occupySpot(VehicleType.CAR, nearest));
    }

    @Test
    void releaseSpot_freesAPreviouslyOccupiedSpot() {
        repository.occupySpot(VehicleType.CAR, nearest);
        repository.releaseSpot("F1-C1");
        assertFalse(repository.getSpot("F1-C1").isOccupied());
    }

    @Test
    void releaseSpot_throwsForUnknownSpotId() {
        assertThrows(SpotNotFoundException.class, () -> repository.releaseSpot("NOPE"));
    }

    @Test
    void generateTicketNumber_incrementsAndFormatsWithLeadingZeros() {
        assertEquals("TKT-00001", repository.generateTicketNumber());
        assertEquals("TKT-00002", repository.generateTicketNumber());
    }

    @Test
    void completeExit_marksPaidAndReturnsComputedAmount() {
        Ticket ticket = new Ticket("TKT-00001", "V1", VehicleType.CAR, "F1-C1", LocalDateTime.now().minusHours(2));
        repository.saveTicket(ticket);

        Ticket result = repository.completeExit("TKT-00001", LocalDateTime.now(), t -> 42.0, "UPI");

        assertEquals(Ticket.PaymentStatus.PAID, result.getPaymentStatus());
        assertEquals(42.0, result.getAmount());
        assertEquals("UPI", result.getPaymentMethod());
        assertNotNull(result.getExitTime());
    }

    @Test
    void completeExit_defaultsPaymentMethodToCashWhenBlank() {
        repository.saveTicket(new Ticket("TKT-1", "V1", VehicleType.CAR, "F1-C1", LocalDateTime.now()));
        Ticket result = repository.completeExit("TKT-1", LocalDateTime.now(), t -> 10.0, "  ");
        assertEquals("CASH", result.getPaymentMethod());
    }

    @Test
    void completeExit_throwsForUnknownTicket() {
        assertThrows(TicketNotFoundException.class, () -> repository.completeExit("MISSING", LocalDateTime.now(), t -> 0.0, "CASH"));
    }

    @Test
    void completeExit_throwsForAlreadyPaidTicket() {
        repository.saveTicket(new Ticket("TKT-1", "V1", VehicleType.CAR, "F1-C1", LocalDateTime.now()));
        repository.completeExit("TKT-1", LocalDateTime.now(), t -> 10.0, "CASH");
        assertThrows(TicketAlreadyExitedException.class, () -> repository.completeExit("TKT-1", LocalDateTime.now(), t -> 10.0, "CASH"));
    }

    @Test
    void getActiveTickets_excludesExitedAndSortsNewestFirst() {
        Ticket older = new Ticket("TKT-1", "V1", VehicleType.CAR, "F1-C1", LocalDateTime.now().minusHours(2));
        Ticket newer = new Ticket("TKT-2", "V2", VehicleType.CAR, "F1-C2", LocalDateTime.now().minusMinutes(5));
        repository.saveTicket(older);
        repository.saveTicket(newer);
        repository.completeExit("TKT-1", LocalDateTime.now(), t -> 5.0, "CASH");

        List<Ticket> active = repository.getActiveTickets();
        assertEquals(1, active.size());
        assertEquals("TKT-2", active.get(0).getTicketNumber());
    }
}

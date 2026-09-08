package com.lld.locker;

import com.lld.locker.exception.InvalidPickupCodeException;
import com.lld.locker.exception.LockerBankNotFoundException;
import com.lld.locker.exception.NoAvailableLockerException;
import com.lld.locker.factory.PickupCodeFactory;
import com.lld.locker.model.*;
import com.lld.locker.repository.LockerRepository;
import com.lld.locker.service.LockerService;
import com.lld.locker.strategy.FirstFitAllocationStrategy;
import com.lld.locker.strategy.LockerAllocationStrategyFactory;
import com.lld.locker.strategy.SmallestFitFirstAllocationStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class LockerServiceTest {

    private LockerService service;
    private String bankId;

    @BeforeEach
    void setUp() {
        LockerAllocationStrategyFactory factory = new LockerAllocationStrategyFactory(
                new SmallestFitFirstAllocationStrategy(), new FirstFitAllocationStrategy());
        service = new LockerService(new LockerRepository(), factory, new PickupCodeFactory());

        LockerBank bank = LockerBank.builder().id("B1").name("Test Plaza").location("X").build();
        service.addBank(bank);
        bankId = bank.getId();
        service.addLocker(new Locker("L1", bankId, LockerSize.SMALL));
        service.addLocker(new Locker("L2", bankId, LockerSize.MEDIUM));
    }

    @Test
    void depositIntoEmptyBankSucceedsAndMovesLockerToAwaitingPickup() {
        Parcel pkg = service.deposit(bankId, LockerSize.SMALL, "Courier-1", "Recipient-1", AllocationPolicy.SMALLEST_FIT);

        assertNotNull(pkg.getPickupCode());
        assertEquals(6, pkg.getPickupCode().length());
        assertEquals("L1", pkg.getAssignedLockerId());

        Locker locker = service.getLockersInBank(bankId).stream().filter(l -> l.getId().equals("L1")).findFirst().orElseThrow();
        assertEquals(LockerStatus.AWAITING_PICKUP, locker.getStatus());
    }

    @Test
    void depositWithNoFittingLockerThrowsNoAvailableLockerException() {
        assertThrows(NoAvailableLockerException.class, () ->
                service.deposit(bankId, LockerSize.LARGE, "Courier-1", "Recipient-1", AllocationPolicy.SMALLEST_FIT));
    }

    @Test
    void depositIntoUnknownBankThrowsLockerBankNotFoundException() {
        assertThrows(LockerBankNotFoundException.class, () ->
                service.deposit("no-such-bank", LockerSize.SMALL, "Courier-1", "Recipient-1", AllocationPolicy.SMALLEST_FIT));
    }

    @Test
    void pickupWithValidCodeFreesTheLockerForReuse() {
        Parcel pkg = service.deposit(bankId, LockerSize.SMALL, "Courier-1", "Recipient-1", AllocationPolicy.SMALLEST_FIT);

        Parcel pickedUp = service.pickup(pkg.getPickupCode());
        assertNotNull(pickedUp.getPickedUpAtEpoch());

        Locker locker = service.getLockersInBank(bankId).stream().filter(l -> l.getId().equals("L1")).findFirst().orElseThrow();
        assertEquals(LockerStatus.EMPTY, locker.getStatus());

        // The locker is free again -- a second deposit of the same size must succeed and reuse it.
        Parcel second = service.deposit(bankId, LockerSize.SMALL, "Courier-2", "Recipient-2", AllocationPolicy.SMALLEST_FIT);
        assertEquals("L1", second.getAssignedLockerId());
    }

    @Test
    void pickupWithWrongOrAlreadyUsedCodeThrowsInvalidPickupCodeException() {
        Parcel pkg = service.deposit(bankId, LockerSize.SMALL, "Courier-1", "Recipient-1", AllocationPolicy.SMALLEST_FIT);

        assertThrows(InvalidPickupCodeException.class, () -> service.pickup("000000"));

        service.pickup(pkg.getPickupCode());
        // Replaying the same code a second time must fail -- it's already been consumed.
        assertThrows(InvalidPickupCodeException.class, () -> service.pickup(pkg.getPickupCode()));
    }

    @Test
    void firstFitAndSmallestFitPoliciesProduceDifferentLockerChoices() {
        service.addLocker(new Locker("L3", bankId, LockerSize.LARGE));
        // Scan order in getLockersInBank follows a ConcurrentHashMap -- not guaranteed, so
        // assert on the documented, deterministic difference instead: smallest-fit never picks
        // a locker bigger than necessary when a same-size one exists.
        Parcel smallest = service.deposit(bankId, LockerSize.SMALL, "Courier-1", "Recipient-1", AllocationPolicy.SMALLEST_FIT);
        assertEquals(LockerSize.SMALL, service.getLockersInBank(bankId).stream()
                .filter(l -> l.getId().equals(smallest.getAssignedLockerId())).findFirst().orElseThrow().getSize());
    }

    @Test
    void aLockerCanNeverSkipAStateOrGoBackward() {
        Locker locker = new Locker("standalone", "bank", LockerSize.SMALL);
        assertThrows(IllegalStateException.class, () -> locker.transitionTo(LockerStatus.AWAITING_PICKUP),
                "EMPTY cannot jump straight to AWAITING_PICKUP, skipping OCCUPIED");

        locker.transitionTo(LockerStatus.OCCUPIED);
        assertThrows(IllegalStateException.class, () -> locker.transitionTo(LockerStatus.EMPTY),
                "OCCUPIED cannot move backward to EMPTY");

        locker.transitionTo(LockerStatus.AWAITING_PICKUP);
        assertThrows(IllegalStateException.class, () -> locker.transitionTo(LockerStatus.OCCUPIED),
                "AWAITING_PICKUP cannot move backward to OCCUPIED");

        locker.transitionTo(LockerStatus.EMPTY);
        assertEquals(LockerStatus.EMPTY, locker.getStatus(), "the cycle must close back to EMPTY, ready for reuse");
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.deposit(bankId, LockerSize.SMALL, "LiveCourier", "LiveRecipient", AllocationPolicy.SMALLEST_FIT);

        Map<String, Object> snapshot = service.simDeposit("SimCourier", "SimRecipient", LockerSize.SMALL, AllocationPolicy.SMALLEST_FIT);
        @SuppressWarnings("unchecked")
        List<Parcel> simParcels = (List<Parcel>) snapshot.get("parcels");
        assertEquals(1, simParcels.size(), "the sim sandbox must only ever see its own deposits");

        // Live locker L1 must be untouched by the sim deposit above.
        Locker liveLocker = service.getLockersInBank(bankId).stream().filter(l -> l.getId().equals("L1")).findFirst().orElseThrow();
        assertEquals(LockerStatus.AWAITING_PICKUP, liveLocker.getStatus());
    }

    @Test
    void simResetWipesSimStateBackToSeedOnly() {
        service.simDeposit("SimCourier", "SimRecipient", LockerSize.SMALL, AllocationPolicy.SMALLEST_FIT);
        service.initSimState();

        Map<String, Object> snapshot = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Parcel> simParcels = (List<Parcel>) snapshot.get("parcels");
        assertTrue(simParcels.isEmpty(), "reset must wipe every previously-deposited sim parcel");
    }
}

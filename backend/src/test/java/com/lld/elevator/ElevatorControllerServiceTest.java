package com.lld.elevator;

import com.lld.elevator.exception.*;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import com.lld.elevator.model.Request;
import com.lld.elevator.observer.ElevatorNotifier;
import com.lld.elevator.observer.ElevatorObserver;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.service.ElevatorControllerService;
import com.lld.elevator.strategy.DispatchPolicy;
import com.lld.elevator.strategy.ElevatorDispatchStrategyFactory;
import com.lld.elevator.strategy.LookScanDispatchStrategy;
import com.lld.elevator.strategy.NearestCarDispatchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ElevatorControllerServiceTest {

    private ElevatorRepository repository;
    private ElevatorControllerService controller;
    private RecordingObserver observer;

    /** A minimal recording {@link ElevatorObserver} — proves {@link ElevatorNotifier} really
     * fans out state-change/door/floor events to independent observers rather than being dead
     * wiring, mirroring how {@code inventory.observer.StockAlertNotifier} is exercised. */
    private static class RecordingObserver implements ElevatorObserver {
        final List<String> events = new ArrayList<>();

        @Override
        public void onElevatorStateChanged(Elevator elevator, ElevatorState oldState, ElevatorState newState) {
            events.add("STATE:" + oldState + "->" + newState);
        }

        @Override
        public void onFloorReached(Elevator elevator, int floor) {
            events.add("FLOOR:" + floor);
        }

        @Override
        public void onDoorStateChanged(Elevator elevator, boolean isOpen) {
            events.add("DOOR:" + isOpen);
        }
    }

    @BeforeEach
    public void setUp() {
        repository = new ElevatorRepository();
        repository.init();
        observer = new RecordingObserver();
        ElevatorNotifier notifier = new ElevatorNotifier(List.of(observer));
        ElevatorDispatchStrategyFactory factory =
                new ElevatorDispatchStrategyFactory(new LookScanDispatchStrategy(), new NearestCarDispatchStrategy());
        controller = new ElevatorControllerService(repository, factory, notifier);
    }

    @Test
    public void requestElevatorAssignsBothSourceAndDestinationStopsUpFront() {
        Request request = controller.handleExternalRequest(1, 5);
        assertEquals("ASSIGNED", request.getStatus());
        assertTrue(request.getAssignedElevatorId() > 0);

        Elevator assigned = repository.getElevator(request.getAssignedElevatorId());
        List<Integer> pending = assigned.getPendingFloors();
        // Elevator A starts at floor 1, so its immediate stop is 1 (same-floor door-open) but the
        // real destination floor 5 must also already be queued — not added by a separate,
        // easy-to-forget second call.
        assertTrue(pending.contains(5) || assigned.getCurrentFloor() == 5,
                "destination floor must be queued on assignment, not left for a caller to add separately");
    }

    @Test
    public void tripCompletesAtTheRealRequestedDestinationNotABogusPlaceholder() {
        Request request = controller.handleExternalRequest(1, 5);
        long elevatorId = request.getAssignedElevatorId();
        assertTrue(elevatorId > 0);

        for (int i = 0; i < 20; i++) {
            controller.stepSimulation();
            Request refreshed = repository.getRequest(request.getId());
            if ("COMPLETED".equals(refreshed.getStatus())) {
                assertEquals(5, repository.getElevator(elevatorId).getCurrentFloor(),
                        "must complete exactly at floor 5, the real requested destination");
                return;
            }
        }
        fail("request never completed within 20 simulation ticks");
    }

    @Test
    public void requestElevatorRejectsOutOfRangeFloors() {
        assertThrows(FloorOutOfRangeException.class, () -> controller.handleExternalRequest(0, 5));
        assertThrows(FloorOutOfRangeException.class, () -> controller.handleExternalRequest(1, 11));
    }

    @Test
    public void requestElevatorRejectsSameSourceAndDestination() {
        assertThrows(InvalidElevatorRequestException.class, () -> controller.handleExternalRequest(3, 3));
    }

    @Test
    public void internalRequestOnUnknownElevatorThrowsNotFound() {
        assertThrows(ElevatorNotFoundException.class, () -> controller.handleInternalRequest(999L, 5));
    }

    @Test
    public void internalRequestOnMaintenanceElevatorThrowsUnavailable() {
        controller.setElevatorMaintenance(1L, true);
        assertThrows(ElevatorUnavailableException.class, () -> controller.handleInternalRequest(1L, 5));
    }

    @Test
    public void maintenanceTogglesAreIdempotentNoOps() {
        controller.setElevatorMaintenance(1L, true);
        assertEquals(ElevatorState.MAINTENANCE, repository.getElevator(1L).getState());
        controller.setElevatorMaintenance(1L, true); // second call must be a harmless no-op
        assertEquals(ElevatorState.MAINTENANCE, repository.getElevator(1L).getState());

        controller.setElevatorMaintenance(1L, false);
        assertEquals(ElevatorState.IDLE, repository.getElevator(1L).getState());
        controller.setElevatorMaintenance(1L, false); // and back
        assertEquals(ElevatorState.IDLE, repository.getElevator(1L).getState());
    }

    @Test
    public void maintenanceOnUnknownElevatorThrowsNotFound() {
        assertThrows(ElevatorNotFoundException.class, () -> controller.setElevatorMaintenance(42L, true));
    }

    @Test
    public void maintenanceReassignsOrphanedStopsAsFreshExternalRequests() {
        Request r1 = controller.handleExternalRequest(1, 9);
        long elevatorId = r1.getAssignedElevatorId();
        assertTrue(elevatorId > 0);

        int requestsBefore = repository.getAllRequests().size();
        controller.setElevatorMaintenance(elevatorId, true);

        assertTrue(repository.getAllRequests().size() > requestsBefore,
                "the orphaned stop must be requeued as a new REASSIGNED_MAINTENANCE request");
        assertTrue(repository.getElevator(elevatorId).getPendingFloors().isEmpty(),
                "the maintenance car itself must be cleared of every stop it can no longer serve");
    }

    @Test
    public void dispatchPolicyDefaultsToLookScanAndCanBeSwitched() {
        assertEquals(DispatchPolicy.LOOK_SCAN, controller.getDispatchPolicy());
        controller.setDispatchPolicy(DispatchPolicy.NEAREST_CAR);
        assertEquals(DispatchPolicy.NEAREST_CAR, controller.getDispatchPolicy());
    }

    @Test
    public void setDispatchPolicyRejectsNull() {
        assertThrows(InvalidElevatorRequestException.class, () -> controller.setDispatchPolicy(null));
    }

    @Test
    public void nearestCarPolicyCanChooseADifferentCarThanLookScan() {
        // E1 stays at its seeded floor 1 (far, but idle). E2 is moved to floor 6, already past
        // floor 4 heading up. Take E3/E4 out of contention entirely so only E1 vs E2 decides it.
        Elevator e2 = repository.getElevator(2L);
        e2.setCurrentFloor(6);
        e2.setDirection(com.lld.elevator.model.Direction.UP);
        e2.setState(ElevatorState.MOVING_UP);
        repository.saveElevator(e2);
        repository.getElevator(3L).setState(ElevatorState.MAINTENANCE);
        repository.getElevator(4L).setState(ElevatorState.MAINTENANCE);

        // LOOK_SCAN: E1 (idle, dist 3) beats E2 (passed the floor, dist 2 + 50 penalty).
        Request lookScanPick = controller.handleExternalRequest(4, 9);
        assertEquals(1L, lookScanPick.getAssignedElevatorId(), "LOOK_SCAN must prefer the idle car over the car that already passed the floor");

        // Reset E1 back to a clean idle-at-1 fixture for a second call under the other policy.
        repository.saveElevator(new Elevator(1L, "A", 8, 1));

        controller.setDispatchPolicy(DispatchPolicy.NEAREST_CAR);
        Request nearest = controller.handleExternalRequest(4, 9);
        assertEquals(2L, nearest.getAssignedElevatorId(), "NEAREST_CAR must ignore that E2 already passed floor 4 and pick it for being physically closer");
    }

    @Test
    public void observerReceivesDoorAndStateEventsFromRealFlow() {
        controller.handleExternalRequest(1, 3); // elevator A starts at floor 1 -> immediate door open
        assertTrue(observer.events.stream().anyMatch(e -> e.startsWith("DOOR:true")),
                "registered observer must see the door-open event fired by the real dispatch flow");
    }

    @Test
    public void stepSimulationNeverExceedsCapacityAcrossManyTicks() {
        controller.handleExternalRequest(1, 9);
        controller.handleExternalRequest(2, 8);
        for (int i = 0; i < 30; i++) {
            List<Elevator> elevators = controller.stepSimulation();
            for (Elevator e : elevators) {
                assertTrue(e.getCurrentOccupancy() <= e.getCapacity());
            }
        }
    }
}

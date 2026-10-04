package com.lld.elevator;

import com.lld.elevator.model.ElevatorSnapshot;
import com.lld.elevator.model.ElevatorState;
import com.lld.elevator.model.SimEvent;
import com.lld.elevator.observer.ElevatorNotifier;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.service.ElevatorControllerService;
import com.lld.elevator.strategy.DispatchPolicy;
import com.lld.elevator.strategy.ElevatorDispatchStrategyFactory;
import com.lld.elevator.strategy.LookScanDispatchStrategy;
import com.lld.elevator.strategy.NearestCarDispatchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ElevatorSimWalkthroughTest {
    private ElevatorRepository repository;
    private ElevatorControllerService controller;

    @BeforeEach
    void setUp() {
        repository = new ElevatorRepository();
        repository.init();
        controller = new ElevatorControllerService(repository,
                new ElevatorDispatchStrategyFactory(new LookScanDispatchStrategy(), new NearestCarDispatchStrategy()),
                new ElevatorNotifier(List.of()));
        controller.initSimState();
    }

    private ElevatorSnapshot car(Map<String, Object> snapshot, long carId) {
        return (ElevatorSnapshot) ((Map<?, ?>) snapshot.get("elevators")).get(carId);
    }

    private long assignedCar() {
        List<SimEvent> events = controller.getSimEvents();
        SimEvent assignment = events.get(events.size() - 1);
        assertEquals("ELEVATOR_ASSIGNED", assignment.getEventType());
        return ((Number) assignment.getData().get("assignedElevatorId")).longValue();
    }

    @ParameterizedTest
    @EnumSource(DispatchPolicy.class)
    void guidedRouteAndMaintenanceUseRealServerStates(DispatchPolicy policy) {
        controller.setDispatchPolicy(policy);
        Map<String, Object> snapshot = controller.simRequest(1, 3);
        long firstCarId = assignedCar();
        assertEquals(ElevatorState.DOOR_OPEN, car(snapshot, firstCarId).getState());

        ElevatorState[] states = {ElevatorState.DOOR_OPEN, ElevatorState.MOVING_UP,
                ElevatorState.MOVING_UP, ElevatorState.DOOR_OPEN, ElevatorState.DOOR_OPEN, ElevatorState.IDLE};
        int[] floors = {1, 1, 2, 3, 3, 3};
        for (int tickIndex = 0; tickIndex < states.length; tickIndex++) {
            snapshot = controller.simStep();
            assertEquals(states[tickIndex], car(snapshot, firstCarId).getState());
            assertEquals(floors[tickIndex], car(snapshot, firstCarId).getCurrentFloor());
        }

        snapshot = controller.simToggleMaintenance(firstCarId, true);
        assertEquals(ElevatorState.MAINTENANCE, car(snapshot, firstCarId).getState());
        controller.simRequest(1, 3);
        long secondCarId = assignedCar();
        assertNotEquals(firstCarId, secondCarId);
        snapshot = controller.simToggleMaintenance(firstCarId, false);
        assertEquals(ElevatorState.IDLE, car(snapshot, firstCarId).getState());
        assertEquals(ElevatorState.MOVING_DOWN, car(snapshot, secondCarId).getState());
        assertTrue(repository.getAllElevators().stream().allMatch(elevator -> elevator.getState() == ElevatorState.IDLE));
    }

    @Test
    void resetClearsTheWalkthroughWithoutMutatingTheLiveBank() {
        controller.simRequest(1, 3);
        controller.simStep();
        controller.initSimState();

        Map<String, Object> snapshot = controller.getSimSnapshots();
        assertEquals(1, car(snapshot, 1L).getCurrentFloor());
        assertEquals(ElevatorState.IDLE, car(snapshot, 1L).getState());
        assertEquals(ElevatorState.MAINTENANCE, car(snapshot, 4L).getState());
        assertEquals(1, controller.getSimEvents().size());
        assertTrue(((List<?>) snapshot.get("pendingRequests")).isEmpty());
        assertTrue(repository.getAllElevators().stream().allMatch(elevator -> elevator.getState() == ElevatorState.IDLE));
    }
}

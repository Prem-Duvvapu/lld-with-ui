package com.lld.elevator;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import com.lld.elevator.strategy.NearestCarDispatchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class NearestCarDispatchStrategyTest {

    private NearestCarDispatchStrategy strategy;
    private List<Elevator> elevators;

    @BeforeEach
    public void setUp() {
        strategy = new NearestCarDispatchStrategy();
        elevators = new ArrayList<>();

        Elevator e1 = new Elevator(1L, "E1", 8, 1);
        e1.setState(ElevatorState.IDLE);
        e1.setDirection(Direction.IDLE);

        // E2 has already passed floor 3 heading up — LookScan would penalize this, NearestCar
        // does not care about direction at all.
        Elevator e2 = new Elevator(2L, "E2", 8, 5);
        e2.setState(ElevatorState.MOVING_UP);
        e2.setDirection(Direction.UP);

        Elevator e3 = new Elevator(3L, "E3", 8, 10);
        e3.setState(ElevatorState.MAINTENANCE);
        e3.setDirection(Direction.IDLE);

        elevators.add(e1);
        elevators.add(e2);
        elevators.add(e3);
    }

    @Test
    public void picksTheRawClosestCarIgnoringDirectionOfTravel() {
        // Floor 3 UP: E1 is 2 away, E2 is 2 away too (tie) -> tie-break lower occupancy/stops/id -> E1.
        Elevator chosen = strategy.selectOptimalElevator(elevators, 3, Direction.UP, 1);
        assertNotNull(chosen);
        assertEquals(1L, chosen.getId());
    }

    @Test
    public void picksTheCarThatHasAlreadyPassedTheFloorIfItIsNearest() {
        // Floor 6 UP: E2 (at 5, already past on this reading) is 1 away, E1 (at 1) is 5 away.
        // NearestCar ignores that E2's direction doesn't matter here — it's just closest.
        Elevator chosen = strategy.selectOptimalElevator(elevators, 6, Direction.UP, 1);
        assertNotNull(chosen);
        assertEquals(2L, chosen.getId());
    }

    @Test
    public void ignoresMaintenanceElevators() {
        Elevator chosen = strategy.selectOptimalElevator(elevators, 10, Direction.DOWN, 1);
        assertNotNull(chosen);
        assertNotEquals(3L, chosen.getId());
    }

    @Test
    public void ignoresFullElevators() {
        for (int i = 0; i < 8; i++) {
            elevators.get(0).boardPassenger();
        }
        Elevator chosen = strategy.selectOptimalElevator(elevators, 1, Direction.UP, 1);
        assertNotNull(chosen);
        assertNotEquals(1L, chosen.getId());
    }

    @Test
    public void returnsNullWhenNoElevatorIsEligible() {
        for (Elevator e : elevators) {
            e.setState(ElevatorState.MAINTENANCE);
        }
        assertNull(strategy.selectOptimalElevator(elevators, 5, Direction.UP, 1));
    }
}

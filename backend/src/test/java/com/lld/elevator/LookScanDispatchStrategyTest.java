package com.lld.elevator;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import com.lld.elevator.strategy.LookScanDispatchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class LookScanDispatchStrategyTest {

    private LookScanDispatchStrategy strategy;
    private List<Elevator> elevators;

    @BeforeEach
    public void setUp() {
        strategy = new LookScanDispatchStrategy();
        elevators = new ArrayList<>();

        // E1: Floor 1, IDLE
        Elevator e1 = new Elevator(1L, "E1", 8, 1);
        e1.setState(ElevatorState.IDLE);
        e1.setDirection(Direction.IDLE);

        // E2: Floor 5, MOVING_UP, currently at 5 heading UP
        Elevator e2 = new Elevator(2L, "E2", 8, 5);
        e2.setState(ElevatorState.MOVING_UP);
        e2.setDirection(Direction.UP);

        // E3: Floor 8, IDLE
        Elevator e3 = new Elevator(3L, "E3", 8, 8);
        e3.setState(ElevatorState.IDLE);
        e3.setDirection(Direction.IDLE);

        // E4: Floor 10, MAINTENANCE
        Elevator e4 = new Elevator(4L, "E4", 8, 10);
        e4.setState(ElevatorState.MAINTENANCE);
        e4.setDirection(Direction.IDLE);

        elevators.add(e1);
        elevators.add(e2);
        elevators.add(e3);
        elevators.add(e4);
    }

    @Test
    public void testNearestIdleElevator() {
        // Floor 2 call UP -> E1 is at Floor 1 (dist=1), E2 at 5 (dist=3), E3 at 8 (dist=6)
        Elevator chosen = strategy.selectOptimalElevator(elevators, 2, Direction.UP, 1);
        assertNotNull(chosen);
        assertEquals(1L, chosen.getId());
    }

    @Test
    public void testOnTheWayElevatorScoring() {
        // Floor 7 call UP -> E2 is at Floor 5 MOVING_UP (dist=2, on the way!), E3 at 8 IDLE (dist=1)
        // E2 score = 2
        // E3 score = 1 -> E3 is closer (dist=1)
        Elevator chosen = strategy.selectOptimalElevator(elevators, 7, Direction.UP, 1);
        assertNotNull(chosen);
        assertEquals(3L, chosen.getId());
    }

    @Test
    public void testPassedElevatorPenalty() {
        // Floor 3 call UP -> E2 is at Floor 5 MOVING_UP (already passed Floor 3!). Score = |5-3| + 50 = 52.
        // E1 at Floor 1 IDLE. Score = |1-3| = 2.
        Elevator chosen = strategy.selectOptimalElevator(elevators, 3, Direction.UP, 1);
        assertNotNull(chosen);
        assertEquals(1L, chosen.getId());
    }

    @Test
    public void testMaintenanceElevatorIgnored() {
        // Floor 9 call UP -> E4 is at Floor 10 (dist=1), but in MAINTENANCE! E3 is at Floor 8 IDLE (dist=1).
        Elevator chosen = strategy.selectOptimalElevator(elevators, 9, Direction.UP, 1);
        assertNotNull(chosen);
        assertEquals(3L, chosen.getId());
    }

    @Test
    public void testFullElevatorIgnored() {
        // Fill E1 completely (8 passengers)
        for (int i = 0; i < 8; i++) {
            elevators.get(0).boardPassenger();
        }

        // Call at Floor 1 UP -> E1 is full, should pick E2 at Floor 5 (or E3)
        Elevator chosen = strategy.selectOptimalElevator(elevators, 1, Direction.UP, 1);
        assertNotNull(chosen);
        assertNotEquals(1L, chosen.getId());
    }
}

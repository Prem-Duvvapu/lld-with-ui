package com.lld.elevator.observer;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Writes every elevator telemetry event to the application log — the audit-trail observer. */
@Component
public class LoggingElevatorObserver implements ElevatorObserver {

    private static final Logger log = LoggerFactory.getLogger(LoggingElevatorObserver.class);

    @Override
    public void onElevatorStateChanged(Elevator elevator, ElevatorState oldState, ElevatorState newState) {
        log.info("[elevator] {} transitioned {} -> {} at floor {}", elevator.getName(), oldState, newState, elevator.getCurrentFloor());
    }

    @Override
    public void onFloorReached(Elevator elevator, int floor) {
        log.debug("[elevator] {} passing floor {}", elevator.getName(), floor);
    }

    @Override
    public void onDoorStateChanged(Elevator elevator, boolean isOpen) {
        log.info("[elevator] {} doors {} at floor {}", elevator.getName(), isOpen ? "OPENED" : "CLOSED", elevator.getCurrentFloor());
    }
}

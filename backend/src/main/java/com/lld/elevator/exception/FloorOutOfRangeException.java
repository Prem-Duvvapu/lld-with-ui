package com.lld.elevator.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a requested source or destination floor falls outside the building's serviced
 * range ({@code [MIN_FLOOR, MAX_FLOOR]} — see {@code ElevatorControllerService}).
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class FloorOutOfRangeException extends ElevatorException {
    public FloorOutOfRangeException(int floor, int minFloor, int maxFloor) {
        super("Floor " + floor + " is out of range [" + minFloor + ", " + maxFloor + "]");
    }
}

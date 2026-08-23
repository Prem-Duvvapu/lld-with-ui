package com.lld.hotel.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a room cannot be booked for the requested date range — either the
 * range overlaps an existing PENDING/CONFIRMED/CHECKED_IN reservation for that
 * room, or the room itself is under maintenance.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class RoomUnavailableException extends HotelException {
    public RoomUnavailableException(String message) {
        super(message);
    }
}

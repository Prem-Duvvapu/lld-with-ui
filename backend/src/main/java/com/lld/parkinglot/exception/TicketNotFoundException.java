package com.lld.parkinglot.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a request references a ticket number that does not exist in the repository. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class TicketNotFoundException extends ParkingLotException {
    public TicketNotFoundException(String ticketNumber) {
        super("No ticket with number " + ticketNumber);
    }
}

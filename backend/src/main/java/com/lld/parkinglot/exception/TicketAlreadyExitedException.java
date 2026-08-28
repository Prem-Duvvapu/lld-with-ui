package com.lld.parkinglot.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a ticket that has already been scanned-and-paid (or otherwise released) is
 * presented at an exit gate a second time. The check-then-act around this failure mode is the
 * classic double-exit race: two concurrent {@code payAndExit} calls for the same ticket must
 * result in exactly one success and one of these — see {@code ParkingLotRepository#completeExit}.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class TicketAlreadyExitedException extends ParkingLotException {
    public TicketAlreadyExitedException(String ticketNumber) {
        super("Ticket " + ticketNumber + " has already exited / been paid");
    }
}

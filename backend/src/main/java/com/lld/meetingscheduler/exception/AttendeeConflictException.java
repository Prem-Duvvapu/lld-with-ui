package com.lld.meetingscheduler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The organizer or one of the attendees already has a non-cancelled meeting — in any room —
 *  overlapping the requested time range. */
@ResponseStatus(HttpStatus.CONFLICT)
public class AttendeeConflictException extends MeetingSchedulerException {
    public AttendeeConflictException(String message) {
        super(message);
    }
}

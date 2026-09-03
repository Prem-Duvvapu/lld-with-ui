package com.lld.meetingscheduler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The requested room already has a non-cancelled meeting overlapping the requested time range. */
@ResponseStatus(HttpStatus.CONFLICT)
public class RoomConflictException extends MeetingSchedulerException {
    public RoomConflictException(String message) {
        super(message);
    }
}

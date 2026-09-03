package com.lld.meetingscheduler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class RoomNotFoundException extends MeetingSchedulerException {
    public RoomNotFoundException(String message) {
        super(message);
    }
}

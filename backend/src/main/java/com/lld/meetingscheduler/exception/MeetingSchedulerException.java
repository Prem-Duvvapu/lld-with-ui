package com.lld.meetingscheduler.exception;

import com.lld.config.DomainException;

/** Base of the meeting-scheduler domain exception hierarchy. Never thrown directly. */
public class MeetingSchedulerException extends DomainException {
    public MeetingSchedulerException(String message) {
        super(message);
    }
}

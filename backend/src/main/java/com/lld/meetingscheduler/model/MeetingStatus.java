package com.lld.meetingscheduler.model;

/** A meeting's lifecycle. There is no reschedule/move operation — cancel and re-book instead, so
 *  the state space stays small enough that {@link #blocksCalendar()} is the only rule needed. */
public enum MeetingStatus {
    SCHEDULED,
    CANCELLED;

    /** True when this meeting still occupies its time range on the room's and every
     *  attendee's calendar. */
    public boolean blocksCalendar() {
        return this == SCHEDULED;
    }
}

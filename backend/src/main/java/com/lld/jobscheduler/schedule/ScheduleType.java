package com.lld.jobscheduler.schedule;

/** The three schedule kinds {@link ScheduleFactory} resolves to a concrete {@link Schedule}. */
public enum ScheduleType {
    ONE_TIME,
    FIXED_RATE,
    CRON
}

package com.lld.jobscheduler.schedule;

import java.time.Instant;
import java.util.Optional;

/**
 * Strategy: given a reference instant, compute the next time a job should run.
 *
 * <p>{@code from} means two different things depending on when it's called, and both are
 * intentional:
 * <ul>
 *   <li>At job creation, {@code from} is "now" — compute the first fire time.</li>
 *   <li>After a job fires, {@code from} is that occurrence's <b>originally scheduled</b> due
 *       time (not the actual, possibly-late, fire time) — so a recurring schedule is
 *       self-correcting and doesn't drift under load the way accumulating real elapsed time
 *       would. {@code JobScheduler} is the only caller and is responsible for passing the right
 *       one of these two.</li>
 * </ul>
 *
 * <p>{@link Optional#empty()} means "this schedule has nothing left to give" — a one-time
 * schedule that has already fired once, or a cron expression whose day-of-month/month
 * combination never occurs (e.g. the 31st of a month capped to 30 days — see
 * {@code CronSchedule}'s class doc for how that's decided).
 */
public interface Schedule {
    Optional<Instant> nextExecutionTime(Instant from);

    /** Human-readable summary for API responses and the frontend's schedule preview. */
    String getDescription();
}

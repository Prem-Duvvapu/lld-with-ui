package com.lld.jobscheduler.misfire;

import com.lld.jobscheduler.model.Job;

import java.time.Instant;

/**
 * "Run it right away, then reschedule normally." The job's status never touches
 * {@code MISFIRED} at all under this policy — it is simply executed (late) exactly like an
 * on-time job via the ordinary {@code SCHEDULED -> RUNNING} edge, so there is nothing for this
 * method to do beyond saying so.
 *
 * <p>Consequence worth naming: if a job has missed <i>several</i> occurrences (a long busy
 * period), {@code JobScheduler}'s dispatch loop will catch every one of them up in a tight burst
 * — each fires, reschedules from its own original due time, immediately finds itself still
 * overdue, and fires again — until the schedule catches up to "now". That catch-up burst is the
 * real-world behaviour this policy exists to demonstrate, in contrast with
 * {@link SkipToNextOccurrenceMisfirePolicy} dropping the whole backlog in one jump.
 */
public class FireImmediatelyMisfirePolicy implements MisfirePolicy {
    @Override
    public boolean handleMisfire(Job job, Instant now) {
        return true;
    }

    @Override
    public MisfirePolicyType getType() {
        return MisfirePolicyType.FIRE_IMMEDIATELY;
    }
}

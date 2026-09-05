package com.lld.jobscheduler.misfire;

import com.lld.jobscheduler.model.Job;

import java.time.Instant;

/**
 * Strategy for what happens to a job whose {@code nextExecutionTime} has already passed by more
 * than {@code JobScheduler}'s misfire threshold before a worker became free to run it (the
 * system was busy).
 *
 * <p>The interface this module's spec describes is a single-argument {@code handleMisfire(Job)}.
 * This implementation deliberately widens it to {@code handleMisfire(Job, Instant now)}: deciding
 * "skip forward to the next occurrence" genuinely requires knowing what "forward" means, and
 * threading an explicit {@code Instant} through (rather than each implementation calling
 * {@code Instant.now()} itself) is what lets the isolated {@code /sim/*} engine's
 * {@link com.lld.jobscheduler.clock.ManualClock} — and every deterministic unit test — drive
 * this decision without any wall-clock dependency. Called out here rather than left as a silent
 * deviation.
 *
 * @return {@code true} if the caller ({@code JobScheduler}) should still execute this occurrence
 *         now, {@code false} if the policy has already fully handled it (transitioned the job
 *         and, if recurring, re-armed its next occurrence) and no execution should happen.
 */
public interface MisfirePolicy {
    boolean handleMisfire(Job job, Instant now);

    MisfirePolicyType getType();
}

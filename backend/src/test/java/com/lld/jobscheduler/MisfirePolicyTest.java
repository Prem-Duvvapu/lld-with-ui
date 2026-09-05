package com.lld.jobscheduler;

import com.lld.jobscheduler.misfire.FireImmediatelyMisfirePolicy;
import com.lld.jobscheduler.misfire.MisfirePolicyType;
import com.lld.jobscheduler.misfire.SkipToNextOccurrenceMisfirePolicy;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobExecutionOutcome;
import com.lld.jobscheduler.model.JobStatus;
import com.lld.jobscheduler.schedule.FixedRateSchedule;
import com.lld.jobscheduler.schedule.OneTimeSchedule;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Each {@code MisfirePolicy} tested directly against a plain {@link Job}, no engine or Spring
 * context involved — proving the two policies genuinely behave differently, per the
 * {@code lld-tests} skill's strategy-in-isolation flavour.
 */
class MisfirePolicyTest {

    @Test
    void fireImmediately_returnsTrueAndLeavesJobUntouched() {
        FireImmediatelyMisfirePolicy policy = new FireImmediatelyMisfirePolicy();
        Job job = Job.builder()
                .id("J-1")
                .status(JobStatus.SCHEDULED)
                .schedule(new FixedRateSchedule(Duration.ofMinutes(1)))
                .nextExecutionTime(Instant.parse("2024-01-01T00:00:00Z"))
                .build();

        boolean shouldExecute = policy.handleMisfire(job, Instant.parse("2024-01-01T00:05:00Z"));

        assertTrue(shouldExecute);
        assertEquals(JobStatus.SCHEDULED, job.getStatus()); // untouched — caller executes it normally
        assertTrue(job.getHistory().isEmpty());
        assertEquals(MisfirePolicyType.FIRE_IMMEDIATELY, policy.getType());
    }

    @Test
    void skipToNextOccurrence_onRecurringJob_dropsTheRunAndReschedulesForward() {
        SkipToNextOccurrenceMisfirePolicy policy = new SkipToNextOccurrenceMisfirePolicy();
        Instant due = Instant.parse("2024-01-01T00:00:00Z");
        Job job = Job.builder()
                .id("J-2")
                .status(JobStatus.SCHEDULED)
                .schedule(new FixedRateSchedule(Duration.ofMinutes(1)))
                .nextExecutionTime(due)
                .build();

        Instant now = Instant.parse("2024-01-01T00:10:00Z"); // 10 minutes late
        boolean shouldExecute = policy.handleMisfire(job, now);

        assertFalse(shouldExecute);
        assertEquals(JobStatus.SCHEDULED, job.getStatus()); // recurring: re-armed, not killed
        assertEquals(now.plus(Duration.ofMinutes(1)), job.getNextExecutionTime());
        assertEquals(1, job.getHistory().size());
        assertEquals(JobExecutionOutcome.SKIPPED_MISFIRE, job.getHistory().get(0).getStatus());
        assertEquals(MisfirePolicyType.SKIP_TO_NEXT_OCCURRENCE, policy.getType());
    }

    @Test
    void skipToNextOccurrence_onExhaustedOneTimeJob_completesAsSkipped() {
        SkipToNextOccurrenceMisfirePolicy policy = new SkipToNextOccurrenceMisfirePolicy();
        Instant due = Instant.parse("2024-01-01T00:00:00Z");
        Job job = Job.builder()
                .id("J-3")
                .status(JobStatus.SCHEDULED)
                .schedule(new OneTimeSchedule(due))
                .nextExecutionTime(due)
                .build();

        // "from" passed to the schedule is `now`, which is after `due` — OneTimeSchedule has
        // nothing left to give, so the policy must complete the job rather than re-arm it.
        boolean shouldExecute = policy.handleMisfire(job, due.plusSeconds(600));

        assertFalse(shouldExecute);
        assertEquals(JobStatus.COMPLETED, job.getStatus());
        assertEquals(JobExecutionOutcome.SKIPPED_MISFIRE, job.getHistory().get(0).getStatus());
    }
}

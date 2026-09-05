package com.lld.jobscheduler.misfire;

import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobExecutionRecord;
import com.lld.jobscheduler.model.JobExecutionOutcome;
import com.lld.jobscheduler.model.JobStatus;

import java.time.Instant;
import java.util.Optional;

/**
 * "Drop the missed run entirely, jump straight to the next future occurrence" — the Quartz
 * {@code MISFIRE_INSTRUCTION_FIRE_ONCE_NOW}-vs-"do nothing, next occurrence stands" distinction,
 * genuinely different from {@link FireImmediatelyMisfirePolicy}: a recurring heartbeat job that
 * missed 10 minutes of ticks does not fire 10 times in a burst — it records one
 * {@link JobExecutionOutcome#SKIPPED_MISFIRE} entry and re-arms for the next real occurrence
 * after {@code now}.
 */
public class SkipToNextOccurrenceMisfirePolicy implements MisfirePolicy {
    @Override
    public boolean handleMisfire(Job job, Instant now) {
        job.transition(JobStatus.MISFIRED);
        job.getHistory().add(JobExecutionRecord.builder()
                .firedAt(now)
                .status(JobExecutionOutcome.SKIPPED_MISFIRE)
                .durationMillis(0)
                .build());

        Optional<Instant> next = job.getSchedule().nextExecutionTime(now);
        if (next.isPresent()) {
            job.setNextExecutionTime(next.get());
            job.transition(JobStatus.SCHEDULED);
        } else {
            // Nothing left to schedule (e.g. a one-time job whose single occurrence was
            // itself the misfire) — it completed, just as a skipped run rather than a real one.
            job.transition(JobStatus.COMPLETED);
        }
        return false;
    }

    @Override
    public MisfirePolicyType getType() {
        return MisfirePolicyType.SKIP_TO_NEXT_OCCURRENCE;
    }
}

package com.lld.jobscheduler.model;

import com.lld.jobscheduler.exception.InvalidJobTransitionException;
import com.lld.jobscheduler.misfire.MisfirePolicy;
import com.lld.jobscheduler.schedule.Schedule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * A scheduled unit of work. There is no real arbitrary user code to execute in this demo — the
 * interesting design is the scheduling machinery, not task execution — so "the work" is
 * represented abstractly by {@link #taskType} plus a {@link #simulatedDurationMillis} recorded
 * into history, not actually slept through.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Job {
    private String id;
    private String name;
    private String taskType;
    private long simulatedDurationMillis;
    private Schedule schedule;
    private JobStatus status;
    private Instant nextExecutionTime;
    private MisfirePolicy misfirePolicy;

    @Builder.Default
    private List<JobExecutionRecord> history = new CopyOnWriteArrayList<>();

    /**
     * One-way "cancel requested" flag, checked and set inside {@code JobScheduler}'s per-job
     * {@code ReentrantLock} — never read or written without holding that lock. It is {@code
     * volatile} rather than lock-free-by-itself: the lock is what makes "check cancelled, then
     * decide whether to execute" atomic with "set cancelled" in {@code cancel()}; {@code
     * volatile} on top of that only guarantees that once the lock-holder sets it, the *next*
     * lock-holder's read sees it immediately, rather than a stale value cached in a CPU register
     * or another core's cache. A plain (non-volatile) field would still be correct as long as
     * every access truly goes through the lock — the volatile keyword here is defense in depth
     * documented explicitly, not a substitute for the lock.
     */
    private volatile boolean cancelled;

    /**
     * The one gate every status change goes through — mirrors {@code uber.model.RideStatus}'s
     * enforcement idiom. Callers must already hold this job's per-job lock; this method does not
     * lock anything itself.
     */
    public void transition(JobStatus next) {
        if (status == null || !status.canTransitionTo(next)) {
            throw new InvalidJobTransitionException(
                    "Job " + id + " cannot transition from " + status + " to " + next);
        }
        this.status = next;
    }
}

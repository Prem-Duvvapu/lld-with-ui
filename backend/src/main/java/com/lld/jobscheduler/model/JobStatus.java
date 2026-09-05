package com.lld.jobscheduler.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Job lifecycle, with the legal transitions declared rather than implied — same idiom as
 * {@code uber.model.RideStatus}: a {@code Map<JobStatus, Set<JobStatus>>} declared once,
 * enforced through one gate ({@code Job.transition()}), instead of every call site re-deriving
 * its own notion of "which statuses may I move from".
 *
 * <pre>
 *   SCHEDULED -&gt; RUNNING -&gt; (COMPLETED | FAILED)
 *   SCHEDULED -&gt; CANCELLED
 *   SCHEDULED -&gt; MISFIRED -&gt; (SCHEDULED | COMPLETED)
 *   COMPLETED -&gt; SCHEDULED         (recurring job's next occurrence)
 *   FAILED    -&gt; SCHEDULED         (a failed run doesn't kill a recurring job's future occurrences)
 * </pre>
 *
 * <p><b>{@link #isTerminal()} is structural, not job-specific.</b> {@code COMPLETED} and
 * {@code FAILED} both declare {@code SCHEDULED} as a legal next state — because a
 * <i>recurring</i> job genuinely does go back to {@code SCHEDULED} after a run — so neither is
 * structurally terminal even though the spec describes them as "terminal for a one-time job".
 * That distinction is enforced by data, not by this enum: a one-time job's {@link
 * com.lld.jobscheduler.schedule.OneTimeSchedule} always returns {@code Optional.empty()} after
 * its single occurrence, so {@code JobScheduler} simply never attempts the
 * {@code COMPLETED -&gt; SCHEDULED} edge for it — the edge is legal but never taken. Only
 * {@code CANCELLED} is unconditionally terminal.
 *
 * <p>{@code MISFIRED} is only ever entered by {@code SkipToNextOccurrenceMisfirePolicy} — a job
 * that misfires under {@code FireImmediatelyMisfirePolicy} is simply executed (late) via the
 * ordinary {@code SCHEDULED -&gt; RUNNING} edge and never visits this state at all.
 */
public enum JobStatus {
    SCHEDULED,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED,
    MISFIRED;

    private static final Map<JobStatus, Set<JobStatus>> ALLOWED = Map.of(
            SCHEDULED, EnumSet.of(RUNNING, CANCELLED, MISFIRED),
            RUNNING, EnumSet.of(COMPLETED, FAILED),
            COMPLETED, EnumSet.of(SCHEDULED),
            FAILED, EnumSet.of(SCHEDULED),
            CANCELLED, EnumSet.noneOf(JobStatus.class),
            MISFIRED, EnumSet.of(SCHEDULED, COMPLETED)
    );

    /** True only for {@code CANCELLED} — see the class doc on why COMPLETED/FAILED are not. */
    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(JobStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<JobStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}

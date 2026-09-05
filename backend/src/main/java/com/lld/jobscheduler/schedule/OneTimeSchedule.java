package com.lld.jobscheduler.schedule;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * Fires exactly once, at {@link #at}, then returns {@link Optional#empty()} forever after.
 *
 * <p>Deliberately stateless — no "have I fired" flag. The one caller, {@code JobScheduler},
 * always passes either the job's creation time (strictly before {@code at}, enforced at
 * creation — see below) for the first computation, or exactly {@code at} itself (the occurrence
 * that just fired) for every computation after. So {@code at.isAfter(from)} alone tells the two
 * cases apart: true only on the first call.
 *
 * <p>A one-time job whose requested instant is not strictly in the future at creation time is
 * rejected with {@code InvalidScheduleException} rather than silently accepted and never fired
 * — see {@code ScheduleFactory}.
 */
public final class OneTimeSchedule implements Schedule {
    private final Instant at;

    public OneTimeSchedule(Instant at) {
        this.at = Objects.requireNonNull(at, "at must not be null");
    }

    public Instant getAt() {
        return at;
    }

    @Override
    public Optional<Instant> nextExecutionTime(Instant from) {
        return at.isAfter(from) ? Optional.of(at) : Optional.empty();
    }

    @Override
    public String getDescription() {
        return "Once at " + at;
    }
}

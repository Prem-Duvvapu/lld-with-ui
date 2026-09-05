package com.lld.jobscheduler.schedule;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * Fires every {@link #interval}, forever — {@code from + interval}, never empty. When
 * {@code JobScheduler} calls this after a fire, {@code from} is the occurrence's originally
 * scheduled time, not the actual (possibly late) fire time, so the cadence doesn't drift under
 * load — this is "fixed rate", not "fixed delay".
 */
public final class FixedRateSchedule implements Schedule {
    private final Duration interval;

    public FixedRateSchedule(Duration interval) {
        Objects.requireNonNull(interval, "interval must not be null");
        if (interval.isZero() || interval.isNegative()) {
            throw new IllegalArgumentException("interval must be positive");
        }
        this.interval = interval;
    }

    public Duration getInterval() {
        return interval;
    }

    @Override
    public Optional<Instant> nextExecutionTime(Instant from) {
        return Optional.of(from.plus(interval));
    }

    @Override
    public String getDescription() {
        return "Every " + interval;
    }
}

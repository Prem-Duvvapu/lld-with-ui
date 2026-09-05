package com.lld.jobscheduler.clock;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

/**
 * A controllable {@link Clock}: time only moves when {@link #advance(Duration)} is called.
 * Backs deterministic schedule/misfire tests and the isolated {@code /sim/*} engine — a demo
 * step can jump the clock straight past a cron job's next fire time, or far enough to force a
 * misfire, instead of a test (or a browser tab) waiting on real time.
 */
public class ManualClock implements Clock {
    private final AtomicReference<Instant> current;

    public ManualClock() {
        this(Instant.EPOCH);
    }

    public ManualClock(Instant start) {
        this.current = new AtomicReference<>(start);
    }

    @Override
    public Instant now() {
        return current.get();
    }

    /** Move time forward. Negative durations are rejected — this clock never goes backwards. */
    public void advance(Duration delta) {
        if (delta.isNegative()) {
            throw new IllegalArgumentException("delta must not be negative");
        }
        current.updateAndGet(i -> i.plus(delta));
    }

    /** Reset to a fixed instant, for a sandbox {@code /sim/reset}. */
    public void reset(Instant to) {
        current.set(to);
    }
}

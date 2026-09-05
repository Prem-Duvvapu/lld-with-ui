package com.lld.jobscheduler.clock;

import java.time.Instant;

/** Real wall-clock time. What the live {@code JobScheduler} engine is built with. */
public class SystemClock implements Clock {
    @Override
    public Instant now() {
        return Instant.now();
    }
}

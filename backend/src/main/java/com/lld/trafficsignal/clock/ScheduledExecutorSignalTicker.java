package com.lld.trafficsignal.clock;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * The real {@link SignalTicker}: a single daemon thread firing every second. One instance is
 * shared for the whole intersection's lifetime and shut down via {@link #shutdown()} when the
 * owning bean is destroyed — the original implementation created a brand new
 * {@code newSingleThreadScheduledExecutor()} per intersection AND another one per emergency
 * override call, none of which were ever shut down (see RCA-038).
 */
public class ScheduledExecutorSignalTicker implements SignalTicker {

    private final ScheduledExecutorService executor;

    public ScheduledExecutorSignalTicker() {
        this.executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "traffic-signal-ticker");
            t.setDaemon(true);
            return t;
        });
    }

    @Override
    public TickHandle scheduleEverySecond(Runnable task) {
        ScheduledFuture<?> future = executor.scheduleAtFixedRate(task, 1, 1, TimeUnit.SECONDS);
        return () -> future.cancel(false);
    }

    /** Stops accepting new work and lets in-flight ticks finish. Idempotent. */
    public void shutdown() {
        executor.shutdown();
    }
}

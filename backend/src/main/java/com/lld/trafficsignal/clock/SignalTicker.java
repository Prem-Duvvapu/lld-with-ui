package com.lld.trafficsignal.clock;

/**
 * Abstraction over "the passage of time" that drives timed phase transitions. Production wiring
 * uses {@link ScheduledExecutorSignalTicker}, a real background scheduler; tests (and the
 * isolated {@code /sim/*} sandbox, which is a user-driven step-by-step demo, not a live clock)
 * use {@link ManualSignalTicker}, which only advances when explicitly told to.
 *
 * <p>This is the seam that keeps timed-transition tests deterministic: a test never sleeps
 * waiting for a real timer to fire — it constructs the intersection with a {@link ManualSignalTicker}
 * and calls {@link ManualSignalTicker#advance(int)} to fire exactly as many one-second ticks as
 * the assertion needs.
 */
public interface SignalTicker {

    /**
     * Registers {@code task} to run once per simulated second. Real implementations run it on a
     * background thread; manual implementations only run it when told to advance.
     *
     * @return a handle that stops the ticking
     */
    TickHandle scheduleEverySecond(Runnable task);

    interface TickHandle {
        void cancel();
    }
}

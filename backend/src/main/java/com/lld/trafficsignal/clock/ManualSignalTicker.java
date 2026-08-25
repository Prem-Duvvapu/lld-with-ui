package com.lld.trafficsignal.clock;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * A controllable {@link SignalTicker}: registered tasks only run when {@link #advance(int)} is
 * called. No thread, no sleeping, no real time involved — this is what keeps timed-transition
 * tests deterministic, and what backs the isolated {@code /sim/*} engine, which advances exactly
 * one simulated second per user click rather than running on a live clock.
 */
public class ManualSignalTicker implements SignalTicker {

    private final List<Runnable> tasks = new CopyOnWriteArrayList<>();

    @Override
    public TickHandle scheduleEverySecond(Runnable task) {
        tasks.add(task);
        return () -> tasks.remove(task);
    }

    /** Fires every registered task once per simulated second, {@code seconds} times, in order. */
    public void advance(int seconds) {
        for (int i = 0; i < seconds; i++) {
            for (Runnable task : new ArrayList<>(tasks)) {
                task.run();
            }
        }
    }
}

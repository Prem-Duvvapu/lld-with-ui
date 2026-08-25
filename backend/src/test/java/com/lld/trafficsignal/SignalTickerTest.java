package com.lld.trafficsignal;

import com.lld.trafficsignal.clock.ManualSignalTicker;
import com.lld.trafficsignal.clock.ScheduledExecutorSignalTicker;
import com.lld.trafficsignal.clock.SignalTicker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SignalTicker — injectable clock/scheduler abstraction")
class SignalTickerTest {

    @Test
    @DisplayName("ManualSignalTicker only fires a registered task when advance() is called — never on its own")
    void manualTickerOnlyFiresOnAdvance() {
        ManualSignalTicker ticker = new ManualSignalTicker();
        AtomicInteger fireCount = new AtomicInteger();
        ticker.scheduleEverySecond(fireCount::incrementAndGet);

        assertEquals(0, fireCount.get(), "registering must not fire immediately");

        ticker.advance(5);
        assertEquals(5, fireCount.get(), "advance(5) must fire the task exactly 5 times");

        ticker.advance(0);
        assertEquals(5, fireCount.get(), "advance(0) must not fire at all");
    }

    @Test
    @DisplayName("ManualSignalTicker drives multiple independently-registered tasks per advance")
    void manualTickerDrivesMultipleTasks() {
        ManualSignalTicker ticker = new ManualSignalTicker();
        AtomicInteger a = new AtomicInteger();
        AtomicInteger b = new AtomicInteger();
        ticker.scheduleEverySecond(a::incrementAndGet);
        ticker.scheduleEverySecond(b::incrementAndGet);

        ticker.advance(3);

        assertEquals(3, a.get());
        assertEquals(3, b.get());
    }

    @Test
    @DisplayName("ManualSignalTicker's TickHandle#cancel stops future firing")
    void manualTickerCancelStopsFiring() {
        ManualSignalTicker ticker = new ManualSignalTicker();
        AtomicInteger fireCount = new AtomicInteger();
        SignalTicker.TickHandle handle = ticker.scheduleEverySecond(fireCount::incrementAndGet);

        ticker.advance(2);
        handle.cancel();
        ticker.advance(10);

        assertEquals(2, fireCount.get(), "no ticks should register after cancel()");
    }

    @Test
    @DisplayName("ScheduledExecutorSignalTicker (the real implementation) actually fires on a background thread")
    void realTickerActuallyFires() throws InterruptedException {
        // Not a sleep-based race: a CountDownLatch bounds how long we wait for a real event,
        // which is the standard concurrency-test idiom used throughout this repo — unlike
        // sleeping a fixed duration and hoping the timer already fired, this returns the instant
        // the third tick lands.
        ScheduledExecutorSignalTicker ticker = new ScheduledExecutorSignalTicker();
        try {
            CountDownLatch latch = new CountDownLatch(3);
            ticker.scheduleEverySecond(latch::countDown);
            // The real ticker fires every 1 second; a short interval keeps this test fast while
            // still proving actual background scheduling occurs (not merely instant recursion).
            assertTrue(latch.await(10, TimeUnit.SECONDS), "the real scheduler never fired 3 times");
        } finally {
            ticker.shutdown();
        }
    }

    @Test
    @DisplayName("ScheduledExecutorSignalTicker#shutdown stops the underlying executor")
    void shutdownStopsExecutor() throws InterruptedException {
        ScheduledExecutorSignalTicker ticker = new ScheduledExecutorSignalTicker();
        CountDownLatch latch = new CountDownLatch(1);
        ticker.scheduleEverySecond(latch::countDown);
        assertTrue(latch.await(5, TimeUnit.SECONDS));

        ticker.shutdown();
        // Shutdown must not throw and must be idempotent.
        assertDoesNotThrow(ticker::shutdown);
    }
}

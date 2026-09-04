package com.lld.threadpool;

import com.lld.threadpool.exception.InvalidPoolConfigException;
import com.lld.threadpool.exception.PoolShutdownException;
import com.lld.threadpool.exception.TaskRejectedException;
import com.lld.threadpool.model.CustomThreadPool;
import com.lld.threadpool.model.SubmitOutcome;
import com.lld.threadpool.model.SubmitResult;
import com.lld.threadpool.strategy.AbortPolicy;
import com.lld.threadpool.strategy.CallerRunsPolicy;
import com.lld.threadpool.strategy.DiscardOldestPolicy;
import com.lld.threadpool.strategy.DiscardPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Single-threaded-from-the-test's-perspective coverage of {@link CustomThreadPool}'s core/queue/
 * max assignment algorithm and each {@link com.lld.threadpool.strategy.RejectionPolicy}. Every
 * task here blocks on its own {@link CountDownLatch} until the test explicitly releases it, so
 * "is this worker busy right now" is under the test's control rather than a race against
 * {@code Thread.sleep} timing.
 */
@Timeout(15)
class CustomThreadPoolTest {

    private Runnable gatedTask(CountDownLatch gate) {
        return () -> {
            try {
                gate.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };
    }

    private void awaitUntil(java.util.function.BooleanSupplier condition, long timeoutMillis) {
        long deadline = System.currentTimeMillis() + timeoutMillis;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) return;
            try {
                Thread.sleep(5);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        assertTrue(condition.getAsBoolean(), "condition never became true within " + timeoutMillis + "ms");
    }

    @Test
    @DisplayName("submissions up to corePoolSize each spawn a new core worker")
    void submissionsUpToCoreSpawnCoreWorkers() {
        CustomThreadPool pool = new CustomThreadPool("p1", 2, 4, 2, 1000, AbortPolicy.INSTANCE);
        CountDownLatch g1 = new CountDownLatch(1);
        CountDownLatch g2 = new CountDownLatch(1);

        pool.submit("t1", gatedTask(g1));
        assertEquals(1, pool.getCurrentWorkerCount());

        pool.submit("t2", gatedTask(g2));
        assertEquals(2, pool.getCurrentWorkerCount());

        g1.countDown();
        g2.countDown();
    }

    @Test
    @DisplayName("once core workers are busy, further tasks queue up to queueCapacity")
    void tasksQueueOnceCoreIsBusy() {
        CustomThreadPool pool = new CustomThreadPool("p2", 1, 3, 2, 1000, AbortPolicy.INSTANCE);
        CountDownLatch g1 = new CountDownLatch(1);
        pool.submit("t1", gatedTask(g1)); // occupies the one core worker

        SubmitResult r2 = pool.submit("t2", gatedTask(new CountDownLatch(1)));
        SubmitResult r3 = pool.submit("t3", gatedTask(new CountDownLatch(1)));

        assertEquals(SubmitOutcome.ACCEPTED, r2.outcome());
        assertEquals(SubmitOutcome.ACCEPTED, r3.outcome());
        assertEquals(1, pool.getCurrentWorkerCount(), "queue capacity absorbs t2/t3, no new worker yet");
        assertEquals(2, pool.getQueueSize());

        g1.countDown();
    }

    @Test
    @DisplayName("once the queue is full, submitting spawns an extra worker up to maxPoolSize")
    void queueFullSpawnsExtraWorkerUpToMax() {
        CustomThreadPool pool = new CustomThreadPool("p3", 1, 2, 1, 1000, AbortPolicy.INSTANCE);
        CountDownLatch g1 = new CountDownLatch(1);
        pool.submit("t1", gatedTask(g1));           // core worker busy
        pool.submit("t2", gatedTask(new CountDownLatch(1))); // fills the 1-slot queue
        assertEquals(1, pool.getCurrentWorkerCount());
        assertEquals(1, pool.getQueueSize());

        SubmitResult r3 = pool.submit("t3", gatedTask(new CountDownLatch(1)));
        assertEquals(SubmitOutcome.ACCEPTED, r3.outcome());
        assertEquals(2, pool.getCurrentWorkerCount(), "queue full + workers < max -> spin up an extra worker");
        assertEquals(1, pool.getQueueSize(), "t3 went straight to the new worker, queue unchanged");

        g1.countDown();
    }

    @Test
    @DisplayName("AbortPolicy throws once workers are at max and the queue is full")
    void abortPolicyThrowsWhenSaturated() {
        CustomThreadPool pool = new CustomThreadPool("p4", 1, 1, 1, 1000, AbortPolicy.INSTANCE);
        pool.submit("t1", gatedTask(new CountDownLatch(1))); // 1 worker (== max), busy
        pool.submit("t2", gatedTask(new CountDownLatch(1))); // fills the queue

        TaskRejectedException ex = assertThrows(TaskRejectedException.class,
                () -> pool.submit("t3", gatedTask(new CountDownLatch(1))));
        assertTrue(ex.getMessage().contains("p4"));
        assertEquals(1, pool.getRejectedCount());
    }

    @Test
    @DisplayName("DiscardPolicy silently drops the task instead of throwing")
    void discardPolicyDropsSilently() {
        CustomThreadPool pool = new CustomThreadPool("p5", 1, 1, 1, 1000, DiscardPolicy.INSTANCE);
        pool.submit("t1", gatedTask(new CountDownLatch(1)));
        pool.submit("t2", gatedTask(new CountDownLatch(1)));

        SubmitResult r3 = pool.submit("t3", gatedTask(new CountDownLatch(1)));
        assertEquals(SubmitOutcome.DISCARDED, r3.outcome());
        assertEquals(1, pool.getRejectedCount());
        assertEquals(1, pool.getQueueSize(), "the discarded task never entered the queue");
    }

    @Test
    @DisplayName("DiscardOldestPolicy evicts the longest-queued task and accepts the new one")
    void discardOldestPolicyEvictsOldest() {
        CustomThreadPool pool = new CustomThreadPool("p6", 1, 1, 1, 1000, DiscardOldestPolicy.INSTANCE);
        pool.submit("t1", gatedTask(new CountDownLatch(1)));                 // worker busy
        SubmitResult oldest = pool.submit("oldest", gatedTask(new CountDownLatch(1))); // queued

        SubmitResult r = pool.submit("newest", gatedTask(new CountDownLatch(1)));
        assertEquals(SubmitOutcome.ACCEPTED, r.outcome());
        assertEquals(oldest.taskId(), r.evictedTaskId());
        assertEquals(1, pool.getRejectedCount(), "the evicted task counts as rejected");
        assertEquals(1, pool.getQueueSize(), "newest replaced oldest 1-for-1, queue size unchanged");
    }

    @Test
    @DisplayName("CallerRunsPolicy runs the task synchronously on the submitting thread, no new worker")
    void callerRunsPolicyRunsOnCallingThread() {
        CustomThreadPool pool = new CustomThreadPool("p7", 1, 1, 0, 1000, CallerRunsPolicy.INSTANCE);
        pool.submit("t1", gatedTask(new CountDownLatch(1))); // worker busy, queueCapacity=0 so already saturated

        Thread testThread = Thread.currentThread();
        AtomicReference<Thread> ranOnThread = new AtomicReference<>();
        SubmitResult r = pool.submit("t2", () -> ranOnThread.set(Thread.currentThread()));

        assertEquals(SubmitOutcome.RAN_ON_CALLER, r.outcome());
        assertSame(testThread, ranOnThread.get(), "must run on the caller's own thread, not a pool worker");
        assertEquals(1, pool.getCurrentWorkerCount(), "no new worker spun up for a caller-runs task");
        assertEquals(1, pool.getCallerRunCount());
    }

    @Test
    @DisplayName("submitting after shutdown() always throws PoolShutdownException, regardless of policy")
    void submitAfterShutdownThrows() {
        CustomThreadPool pool = new CustomThreadPool("p8", 1, 1, 0, 1000, CallerRunsPolicy.INSTANCE);
        pool.shutdown();
        assertThrows(PoolShutdownException.class, () -> pool.submit("late", () -> {}));
    }

    @Test
    @DisplayName("shutdownNow drains and rejects every still-queued task")
    void shutdownNowDrainsQueue() {
        CustomThreadPool pool = new CustomThreadPool("p9", 1, 1, 2, 1000, AbortPolicy.INSTANCE);
        pool.submit("t1", gatedTask(new CountDownLatch(1)));
        pool.submit("t2", gatedTask(new CountDownLatch(1)));
        pool.submit("t3", gatedTask(new CountDownLatch(1)));
        assertEquals(2, pool.getQueueSize());

        List<?> drained = pool.shutdownNow();
        assertEquals(2, drained.size());
        assertEquals(0, pool.getQueueSize());
        assertTrue(pool.isShuttingDown());
    }

    @Test
    @DisplayName("resize rejects an invalid (max < core) configuration and leaves the pool unchanged")
    void resizeRejectsInvalidConfig() {
        CustomThreadPool pool = new CustomThreadPool("p10", 2, 4, 2, 1000, AbortPolicy.INSTANCE);
        assertThrows(InvalidPoolConfigException.class, () -> pool.resize(5, 3));
        assertEquals(2, pool.getCorePoolSize());
        assertEquals(4, pool.getMaxPoolSize());
    }

    @Test
    @DisplayName("resize applies a valid configuration")
    void resizeAppliesValidConfig() {
        CustomThreadPool pool = new CustomThreadPool("p11", 2, 4, 2, 1000, AbortPolicy.INSTANCE);
        pool.resize(3, 6);
        assertEquals(3, pool.getCorePoolSize());
        assertEquals(6, pool.getMaxPoolSize());
    }

    @Test
    @DisplayName("releasing a gate frees its worker, which then picks up the next queued task")
    void releasingATaskLetsTheFreedWorkerPickUpTheNext() {
        CustomThreadPool pool = new CustomThreadPool("p12", 1, 1, 1, 1000, AbortPolicy.INSTANCE);
        CountDownLatch g1 = new CountDownLatch(1);
        pool.submit("t1", gatedTask(g1));
        pool.submit("t2", gatedTask(new CountDownLatch(1)));
        assertEquals(1, pool.getQueueSize());

        g1.countDown();

        awaitUntil(() -> pool.getQueueSize() == 0, 1000);
        assertEquals(1, pool.getCurrentWorkerCount(), "the same single worker now runs t2");
    }

    @Test
    @DisplayName("a completed task increments completedCount exactly once")
    void completedTaskIncrementsCompletedCount() {
        CustomThreadPool pool = new CustomThreadPool("p13", 1, 1, 0, 1000, AbortPolicy.INSTANCE);
        CountDownLatch g = new CountDownLatch(1);
        pool.submit("t1", gatedTask(g));
        g.countDown();

        awaitUntil(() -> pool.getCompletedCount() == 1, 1000);
        assertEquals(0, pool.getRejectedCount());
    }

    @Test
    @DisplayName("constructing with max < core is rejected")
    void constructingWithMaxLessThanCoreIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> new CustomThreadPool("bad", 5, 2, 1, 1000, AbortPolicy.INSTANCE));
    }
}

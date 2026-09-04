package com.lld.threadpool;

import com.lld.threadpool.exception.PoolNotFoundException;
import com.lld.threadpool.model.CustomThreadPool;
import com.lld.threadpool.model.PoolStats;
import com.lld.threadpool.model.SubmitOutcome;
import com.lld.threadpool.model.SubmitResult;
import com.lld.threadpool.repository.ThreadPoolRepository;
import com.lld.threadpool.service.ThreadPoolService;
import com.lld.threadpool.strategy.AbortPolicy;
import com.lld.threadpool.strategy.RejectionPolicyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Facade-level coverage: not-found translation, DTO shape, and the isolated {@code /sim/*}
 *  engine's deterministic 8-step narrative end to end. */
class ThreadPoolServiceTest {

    private ThreadPoolRepository repository;
    private ThreadPoolService service;

    @BeforeEach
    void setUp() {
        repository = new ThreadPoolRepository();
        service = new ThreadPoolService(repository, new RejectionPolicyFactory());
        repository.register(new CustomThreadPool("demo-pool", 1, 1, 0, 1000, AbortPolicy.INSTANCE));
    }

    @Test
    @DisplayName("getStats on an unknown pool throws PoolNotFoundException")
    void getStatsUnknownPoolThrows() {
        assertThrows(PoolNotFoundException.class, () -> service.getStats("no-such-pool"));
    }

    @Test
    @DisplayName("submitTask against a known pool returns an ACCEPTED result and updates stats")
    void submitTaskUpdatesStats() {
        SubmitResult result = service.submitTask("demo-pool", "t1", 5_000);
        assertEquals(SubmitOutcome.ACCEPTED, result.outcome());

        PoolStats stats = service.getStats("demo-pool");
        assertEquals("demo-pool", stats.poolId());
        assertEquals(1, stats.currentWorkerCount());
        assertEquals(1, stats.submittedCount());
        assertFalse(stats.shuttingDown());
    }

    @Test
    @DisplayName("listPools returns one entry per registered pool")
    void listPoolsReturnsEveryPool() {
        repository.register(new CustomThreadPool("second-pool", 1, 1, 0, 1000, AbortPolicy.INSTANCE));
        assertEquals(2, service.listPools().size());
    }

    @Test
    @DisplayName("shutdownPool flips shuttingDown in the returned stats")
    void shutdownPoolFlipsFlag() {
        PoolStats stats = service.shutdownPool("demo-pool");
        assertTrue(stats.shuttingDown());
    }

    // ---- sim engine: the fixed 8-step narrative ----

    @Test
    @DisplayName("sim: the full 8-step narrative — core fill, queue fill, extra worker, rejection, release, shutdown")
    void simEightStepNarrative() {
        Map<String, Object> snap1 = service.simReset(); // step 1
        assertEquals("sim-pool", ((PoolStats) snap1.get("stats")).poolId());

        service.simSubmit(2); // T1 -> core worker A
        PoolStats afterT1 = (PoolStats) service.getSimSnapshot().get("stats");
        assertEquals(1, afterT1.currentWorkerCount());
        assertEquals(0, afterT1.queueSize());

        service.simSubmit(3); // T2 -> core worker B
        PoolStats afterT2 = (PoolStats) service.getSimSnapshot().get("stats");
        assertEquals(2, afterT2.currentWorkerCount());
        assertEquals(0, afterT2.queueSize());

        service.simSubmit(4); // T3 -> queue (cap 1)
        PoolStats afterT3 = (PoolStats) service.getSimSnapshot().get("stats");
        assertEquals(2, afterT3.currentWorkerCount());
        assertEquals(1, afterT3.queueSize());

        service.simSubmit(5); // T4 -> queue full, workers(2)<max(3) -> extra worker C
        PoolStats afterT4 = (PoolStats) service.getSimSnapshot().get("stats");
        assertEquals(3, afterT4.currentWorkerCount());
        assertEquals(1, afterT4.queueSize());

        Map<String, Object> snap6 = service.simSubmit(6); // T5 -> saturated -> AbortPolicy rejects
        var events = (java.util.List<?>) snap6.get("events");
        assertEquals("TASK_REJECTED", ((com.lld.threadpool.model.SimEvent) events.get(events.size() - 1)).getEventType());
        PoolStats afterT5 = (PoolStats) service.getSimSnapshot().get("stats");
        assertEquals(1, afterT5.rejectedCount());
        assertEquals(3, afterT5.currentWorkerCount(), "a rejected task must not spin up a worker");

        service.simReleaseOldest(7); // releases T1 -> worker A frees -> picks up queued T3
        PoolStats afterRelease = (PoolStats) service.getSimSnapshot().get("stats");
        assertEquals(0, afterRelease.queueSize(), "T3 moved out of the queue onto the freed worker");
        assertEquals(1, afterRelease.completedCount());

        Map<String, Object> snap8 = service.simShutdown(8);
        PoolStats afterShutdown = (PoolStats) ((Map<?, ?>) snap8).get("stats");
        assertTrue(afterShutdown.shuttingDown());
    }

    @Test
    @DisplayName("sim: releasing when nothing is pending logs an INFO event, not an error")
    void simReleaseWithNothingPendingIsInfo() {
        service.simReset();
        Map<String, Object> snap = service.simReleaseOldest(2);
        var events = (java.util.List<?>) snap.get("events");
        assertEquals("NOTHING_TO_RELEASE", ((com.lld.threadpool.model.SimEvent) events.get(events.size() - 1)).getEventType());
    }
}

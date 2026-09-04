package com.lld.threadpool.service;

import com.lld.threadpool.exception.PoolNotFoundException;
import com.lld.threadpool.exception.TaskRejectedException;
import com.lld.threadpool.model.CustomThreadPool;
import com.lld.threadpool.model.PoolStats;
import com.lld.threadpool.model.SimEvent;
import com.lld.threadpool.model.SubmitOutcome;
import com.lld.threadpool.model.SubmitResult;
import com.lld.threadpool.repository.ThreadPoolRepository;
import com.lld.threadpool.strategy.RejectionPolicyFactory;
import com.lld.threadpool.strategy.RejectionPolicyType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Facade the controller delegates to wholesale. Owns the production {@link ThreadPoolRepository}
 * (real pools, tasks sleep for their requested duration) plus a completely separate isolated
 * sandbox pool for the {@code /sim/*} engine.
 *
 * <p>The sim pool's tasks never complete on their own — each is a real {@link Runnable} parked on
 * a dedicated {@link CountDownLatch} until {@link #simReleaseOldest} explicitly releases the
 * oldest one, FIFO. This is what makes an 8-step guided demo backed by genuinely concurrent worker
 * threads deterministic: a real {@code Thread.sleep}-based task would eventually finish on its own
 * real-time schedule regardless of how fast a person clicks through the demo, silently changing
 * which step spawns a new worker vs. rejects — exactly the kind of flakiness
 * {@code trafficsignal.clock.ManualSignalTicker} and {@code ratelimiter}'s virtual clock exist to
 * avoid for their own sim engines.
 */
@Service
public class ThreadPoolService {

    private static final String SIM_POOL_ID = "sim-pool";

    private final ThreadPoolRepository repository;
    private final RejectionPolicyFactory policyFactory;

    private volatile CustomThreadPool simPool;
    private final Deque<CountDownLatch> simGates = new ArrayDeque<>();
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);
    private final AtomicInteger simTaskSeq = new AtomicInteger(1);

    @Autowired
    public ThreadPoolService(ThreadPoolRepository repository, RejectionPolicyFactory policyFactory) {
        this.repository = repository;
        this.policyFactory = policyFactory;
        this.simPool = newSimPool();
    }

    private CustomThreadPool newSimPool() {
        return new CustomThreadPool(SIM_POOL_ID, 2, 3, 1, 5000,
                policyFactory.create(RejectionPolicyType.ABORT));
    }

    // =========================================================================
    // PRODUCTION OPERATIONS
    // =========================================================================

    public SubmitResult submitTask(String poolId, String taskName, long durationMillis) {
        CustomThreadPool pool = requirePool(poolId);
        long safeDuration = Math.max(0, durationMillis);
        return pool.submit(taskName, () -> {
            try {
                Thread.sleep(safeDuration);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }

    public PoolStats getStats(String poolId) {
        return toStats(requirePool(poolId));
    }

    public List<PoolStats> listPools() {
        return repository.listPoolIds().stream()
                .map(id -> toStats(repository.find(id)))
                .toList();
    }

    public PoolStats resizePool(String poolId, int corePoolSize, int maxPoolSize) {
        CustomThreadPool pool = requirePool(poolId);
        pool.resize(corePoolSize, maxPoolSize);
        return toStats(pool);
    }

    public PoolStats shutdownPool(String poolId) {
        CustomThreadPool pool = requirePool(poolId);
        pool.shutdown();
        return toStats(pool);
    }

    private CustomThreadPool requirePool(String poolId) {
        CustomThreadPool pool = repository.find(poolId);
        if (pool == null) {
            throw new PoolNotFoundException("No thread pool registered with id " + poolId + ".");
        }
        return pool;
    }

    private PoolStats toStats(CustomThreadPool pool) {
        return new PoolStats(
                pool.getPoolId(),
                pool.getCorePoolSize(),
                pool.getMaxPoolSize(),
                pool.getQueueCapacity(),
                pool.getRejectionPolicy().type().name(),
                pool.getCurrentWorkerCount(),
                pool.getQueueSize(),
                pool.getSubmittedCount(),
                pool.getCompletedCount(),
                pool.getRejectedCount(),
                pool.getCallerRunCount(),
                pool.isShuttingDown(),
                pool.isTerminated()
        );
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        simTaskSeq.set(1);
        simGates.clear();
        this.simPool = newSimPool();

        SimEvent event = SimEvent.builder()
                .id(nextEventId()).stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Pool Cold Start")
                .description("sim-pool configured with corePoolSize=2, maxPoolSize=3, queueCapacity=1, AbortPolicy.")
                .build()
                .addDetail("corePoolSize", 2).addDetail("maxPoolSize", 3).addDetail("queueCapacity", 1);
        simEvents.add(event);
        return getSimSnapshot();
    }

    /** Submits one gated task (never completes until {@link #simReleaseOldest} releases it) and
     *  logs what the pool actually did with it. */
    public synchronized Map<String, Object> simSubmit(int step) {
        String taskName = "T" + simTaskSeq.getAndIncrement();
        CountDownLatch gate = new CountDownLatch(1);
        Runnable gatedTask = () -> {
            try {
                gate.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };

        SimEvent event;
        try {
            SubmitResult result = simPool.submit(taskName, gatedTask);
            if (result.outcome() == SubmitOutcome.ACCEPTED) {
                simGates.addLast(gate);
            }
            event = SimEvent.builder()
                    .id(nextEventId()).stepNumber(step).eventType("TASK_SUBMITTED").status("SUCCESS")
                    .title("Task " + taskName + " Submitted")
                    .description(describeAcceptedOutcome(taskName, result))
                    .build()
                    .addDetail("taskId", result.taskId())
                    .addDetail("outcome", result.outcome().name());
        } catch (TaskRejectedException e) {
            event = SimEvent.builder()
                    .id(nextEventId()).stepNumber(step).eventType("TASK_REJECTED").status("ERROR")
                    .title("Task " + taskName + " Rejected")
                    .description(e.getMessage())
                    .build();
        }
        simEvents.add(event);
        settle();
        return getSimSnapshot();
    }

    private String describeAcceptedOutcome(String taskName, SubmitResult result) {
        int workers = simPool.getCurrentWorkerCount();
        int queued = simPool.getQueueSize();
        return taskName + " accepted. Pool now has " + workers + " worker(s) and " + queued
                + " task(s) queued.";
    }

    /** Releases the oldest still-pending gated task, FIFO — the deterministic stand-in for "some
     *  time passes and a task finishes." */
    public synchronized Map<String, Object> simReleaseOldest(int step) {
        CountDownLatch gate = simGates.pollFirst();
        SimEvent event;
        if (gate != null) {
            gate.countDown();
            settle();
            event = SimEvent.builder()
                    .id(nextEventId()).stepNumber(step).eventType("TASK_COMPLETED").status("SUCCESS")
                    .title("Oldest Running Task Released")
                    .description("The longest-running task finished. Pool now has "
                            + simPool.getCurrentWorkerCount() + " worker(s) and " + simPool.getQueueSize()
                            + " task(s) queued; a queued task (if any) has moved onto the freed worker.")
                    .build();
        } else {
            event = SimEvent.builder()
                    .id(nextEventId()).stepNumber(step).eventType("NOTHING_TO_RELEASE").status("INFO")
                    .title("No Running Task To Release")
                    .description("Every gated task has already been released.")
                    .build();
        }
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simShutdown(int step) {
        simPool.shutdown();
        SimEvent event = SimEvent.builder()
                .id(nextEventId()).stepNumber(step).eventType("SHUTDOWN").status("SUCCESS")
                .title("Graceful Shutdown Initiated")
                .description("No new tasks accepted. Workers still holding a gated task remain blocked "
                        + "until explicitly released; any already-queued task keeps draining first.")
                .build();
        simEvents.add(event);
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("stats", toStats(simPool));
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    private String nextEventId() {
        return "EV-" + simEventIdGen.getAndIncrement();
    }

    /** A newly-spawned worker thread needs a moment of real OS scheduling to actually reach its
     *  first {@code takeTask()} call; without this, an immediate snapshot could show a task still
     *  sitting in the queue for the few milliseconds before the worker it was assigned to has
     *  picked it up. Purely cosmetic for the demo — every *count* (worker/queue size) is already
     *  correct synchronously, since {@code submit()} mutates them under lock before returning. */
    private void settle() {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

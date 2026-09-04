package com.lld.threadpool.model;

import com.lld.threadpool.exception.PoolShutdownException;
import com.lld.threadpool.exception.TaskRejectedException;
import com.lld.threadpool.strategy.RejectionPolicy;

import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A thread pool built from scratch — real {@link Thread}s pulling from a real bounded queue,
 * not a wrapper around {@link java.util.concurrent.ThreadPoolExecutor}. Mirrors that class's core
 * algorithm (JDK Javadoc, "Core and maximum pool sizes"): a task always goes through the queue;
 * whether a *new* worker gets spun up to service it (rather than an existing idle one) depends only
 * on how many workers already exist relative to {@code corePoolSize}/{@code maxPoolSize} at
 * submission time, checked in this fixed order:
 * <ol>
 *   <li>fewer than {@code corePoolSize} workers exist → start a new (core) worker</li>
 *   <li>the queue has room → enqueue, let an existing worker pick it up</li>
 *   <li>fewer than {@code maxPoolSize} workers exist → start a new (non-core) worker</li>
 *   <li>otherwise → saturated; ask {@link #rejectionPolicy}</li>
 * </ol>
 *
 * <p>{@link #lock} guards every piece of mutable pool state (the queue, the worker set/count, the
 * shutdown flags) — {@link Worker#run()} executes the task itself *outside* the lock, so a
 * long-running task never blocks submission or other workers' queue access.
 */
public class CustomThreadPool {

    private final String poolId;
    private volatile int corePoolSize;
    private volatile int maxPoolSize;
    private final int queueCapacity;
    private final long keepAliveMillis;
    private final RejectionPolicy rejectionPolicy;

    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notEmpty = lock.newCondition();
    private final ArrayDeque<PoolTask> queue = new ArrayDeque<>();
    private final Set<Worker> workers = new HashSet<>();
    private int workerCount;
    private int workerSeq;

    private volatile boolean shuttingDown;
    private volatile boolean terminatingNow;
    private volatile boolean terminated;
    private final CountDownLatch terminationLatch = new CountDownLatch(1);

    private final AtomicInteger taskSeq = new AtomicInteger(1);
    private final AtomicLong submittedCount = new AtomicLong();
    private final AtomicLong completedCount = new AtomicLong();
    private final AtomicLong rejectedCount = new AtomicLong();
    private final AtomicLong callerRunCount = new AtomicLong();

    public CustomThreadPool(String poolId, int corePoolSize, int maxPoolSize, int queueCapacity,
                             long keepAliveMillis, RejectionPolicy rejectionPolicy) {
        if (corePoolSize < 0 || maxPoolSize < 1 || maxPoolSize < corePoolSize || queueCapacity < 0) {
            throw new IllegalArgumentException("Invalid pool sizing: core=" + corePoolSize
                    + ", max=" + maxPoolSize + ", queueCapacity=" + queueCapacity);
        }
        this.poolId = poolId;
        this.corePoolSize = corePoolSize;
        this.maxPoolSize = maxPoolSize;
        this.queueCapacity = queueCapacity;
        this.keepAliveMillis = keepAliveMillis;
        this.rejectionPolicy = rejectionPolicy;
    }

    /** Submits {@code runnable} under a generated task id/name. Convenience for the common case;
     *  {@link #submit(String, Runnable)} is the primitive tests drive directly. */
    public SubmitResult submit(Runnable runnable) {
        return submit("task-" + taskSeq.getAndIncrement(), runnable);
    }

    public SubmitResult submit(String taskName, Runnable runnable) {
        String taskId = poolId + "-t" + taskSeq.getAndIncrement();
        Runnable callerRunTask = null;
        PoolTask task = new PoolTask(taskId, taskName, runnable, System.currentTimeMillis());

        lock.lock();
        try {
            if (shuttingDown) {
                throw new PoolShutdownException("Pool '" + poolId + "' is shutting down; new tasks are no longer accepted.");
            }
            submittedCount.incrementAndGet();

            if (tryAssignDirectly(task)) {
                return new SubmitResult(taskId, taskName, SubmitOutcome.ACCEPTED, null);
            }

            switch (rejectionPolicy.decide()) {
                case ABORT -> {
                    rejectedCount.incrementAndGet();
                    throw new TaskRejectedException("Pool '" + poolId + "' is saturated ("
                            + workerCount + "/" + maxPoolSize + " workers, " + queue.size() + "/"
                            + queueCapacity + " queued) — task '" + taskName + "' rejected.");
                }
                case DISCARD -> {
                    task.setStatus(TaskStatus.REJECTED);
                    rejectedCount.incrementAndGet();
                    return new SubmitResult(taskId, taskName, SubmitOutcome.DISCARDED, null);
                }
                case DISCARD_OLDEST -> {
                    PoolTask evicted = queue.pollFirst();
                    String evictedId = null;
                    if (evicted != null) {
                        evicted.setStatus(TaskStatus.REJECTED);
                        rejectedCount.incrementAndGet();
                        evictedId = evicted.getId();
                    }
                    queue.addLast(task);
                    task.setStatus(TaskStatus.QUEUED);
                    notEmpty.signal();
                    return new SubmitResult(taskId, taskName, SubmitOutcome.ACCEPTED, evictedId);
                }
                case CALLER_RUNS -> callerRunTask = runnable;
            }
        } finally {
            lock.unlock();
        }

        // CALLER_RUNS: execute outside the lock, on the submitting thread, no worker involved.
        callerRunCount.incrementAndGet();
        task.setStatus(TaskStatus.RUNNING);
        callerRunTask.run();
        task.setStatus(TaskStatus.COMPLETED);
        completedCount.incrementAndGet();
        return new SubmitResult(taskId, taskName, SubmitOutcome.RAN_ON_CALLER, null);
    }

    /** Caller already holds {@link #lock}. */
    private boolean tryAssignDirectly(PoolTask task) {
        if (workerCount < corePoolSize) {
            spawnWorker(true, task);
            return true;
        }
        if (queue.size() < queueCapacity) {
            enqueue(task);
            return true;
        }
        if (workerCount < maxPoolSize) {
            spawnWorker(false, task);
            return true;
        }
        return false;
    }

    private void enqueue(PoolTask task) {
        queue.addLast(task);
        task.setStatus(TaskStatus.QUEUED);
        notEmpty.signal();
    }

    /**
     * Spawns a worker dedicated to {@code firstTask}, handing it directly to the worker rather
     * than through {@link #queue} — the queue must only ever hold tasks waiting for an *existing*
     * worker to free up. Routing a freshly-spawned worker's own task through the queue too (an
     * earlier version of this method did exactly that) creates a real race: the new worker's
     * thread needs a moment of OS scheduling before its first {@code takeTask()} call actually
     * dequeues that task, and any {@code submit()} racing in during that window sees
     * {@code queue.size()} transiently overcounting — including the one still "in" the queue but
     * already spoken for — which corrupts the very core/queue/max decision this method exists to
     * make correctly. Caught by {@code CustomThreadPoolTest}, not by inspection.
     */
    private void spawnWorker(boolean core, PoolTask firstTask) {
        workerCount++;
        Worker worker = new Worker(this, core, poolId + "-worker-" + (++workerSeq), firstTask);
        workers.add(worker);
        Thread thread = new Thread(worker, worker.getName());
        thread.setDaemon(true);
        worker.setThread(thread);
        thread.start();
    }

    /** Called only by a {@link Worker}'s own thread. Blocks until a task is available, this
     *  worker's keep-alive elapses (non-core only), or the pool is shutting down with nothing
     *  left to drain — at which point it returns {@code null}, telling the worker to exit. */
    PoolTask takeTask(Worker worker) {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                if (terminatingNow || (shuttingDown && queue.isEmpty())) {
                    return null;
                }
                if (worker.isCore()) {
                    notEmpty.await();
                } else {
                    boolean signalled = notEmpty.await(keepAliveMillis, TimeUnit.MILLISECONDS);
                    if (!signalled) {
                        return null; // idle past keep-alive — this extra worker retires
                    }
                }
            }
            if (terminatingNow) {
                return null;
            }
            return queue.pollFirst();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } finally {
            lock.unlock();
        }
    }

    /** Called by a {@link Worker}'s own thread, outside {@link #lock}, so a slow task never blocks
     *  submission or its siblings. */
    void runTask(PoolTask task, Worker worker) {
        task.setWorkerName(worker.getName());
        task.setStatus(TaskStatus.RUNNING);
        try {
            task.getRunnable().run();
        } finally {
            task.setStatus(TaskStatus.COMPLETED);
            completedCount.incrementAndGet();
        }
    }

    /** Called only by a {@link Worker}'s own thread, once its run loop exits. */
    void workerTerminated(Worker worker) {
        lock.lock();
        try {
            workers.remove(worker);
            workerCount--;
            if ((shuttingDown || terminatingNow) && workers.isEmpty()) {
                terminated = true;
                terminationLatch.countDown();
            }
        } finally {
            lock.unlock();
        }
    }

    /** Stops accepting new tasks; existing workers keep draining the queue until it's empty, then
     *  retire. Never interrupts a task already running. */
    public void shutdown() {
        lock.lock();
        try {
            shuttingDown = true;
            if (workers.isEmpty()) {
                terminated = true;
                terminationLatch.countDown();
            }
            notEmpty.signalAll();
        } finally {
            lock.unlock();
        }
    }

    /** Stops accepting new tasks AND drops every still-queued (not-yet-started) task immediately,
     *  interrupting every live worker thread (best-effort — a worker's currently-running task must
     *  cooperate with interruption to actually stop early). Returns the tasks that were queued but
     *  never got to run. */
    public java.util.List<PoolTask> shutdownNow() {
        lock.lock();
        try {
            shuttingDown = true;
            terminatingNow = true;
            java.util.List<PoolTask> drained = new java.util.ArrayList<>(queue);
            drained.forEach(t -> t.setStatus(TaskStatus.REJECTED));
            rejectedCount.addAndGet(drained.size());
            queue.clear();
            notEmpty.signalAll();
            for (Worker w : workers) {
                w.getThread().interrupt();
            }
            if (workers.isEmpty()) {
                terminated = true;
                terminationLatch.countDown();
            }
            return drained;
        } finally {
            lock.unlock();
        }
    }

    public boolean awaitTermination(long timeoutMillis) throws InterruptedException {
        return terminationLatch.await(timeoutMillis, TimeUnit.MILLISECONDS);
    }

    public void resize(int newCorePoolSize, int newMaxPoolSize) {
        lock.lock();
        try {
            if (newCorePoolSize < 0 || newMaxPoolSize < 1 || newMaxPoolSize < newCorePoolSize) {
                throw new com.lld.threadpool.exception.InvalidPoolConfigException(
                        "Invalid resize: core=" + newCorePoolSize + ", max=" + newMaxPoolSize);
            }
            this.corePoolSize = newCorePoolSize;
            this.maxPoolSize = newMaxPoolSize;
            // Lazily grown on next submit, matching ThreadPoolExecutor — no eager spin-up here.
        } finally {
            lock.unlock();
        }
    }

    public String getPoolId() {
        return poolId;
    }

    public int getCorePoolSize() {
        return corePoolSize;
    }

    public int getMaxPoolSize() {
        return maxPoolSize;
    }

    public int getQueueCapacity() {
        return queueCapacity;
    }

    public RejectionPolicy getRejectionPolicy() {
        return rejectionPolicy;
    }

    public int getCurrentWorkerCount() {
        lock.lock();
        try {
            return workerCount;
        } finally {
            lock.unlock();
        }
    }

    public int getQueueSize() {
        lock.lock();
        try {
            return queue.size();
        } finally {
            lock.unlock();
        }
    }

    public long getSubmittedCount() {
        return submittedCount.get();
    }

    public long getCompletedCount() {
        return completedCount.get();
    }

    public long getRejectedCount() {
        return rejectedCount.get();
    }

    public long getCallerRunCount() {
        return callerRunCount.get();
    }

    public boolean isShuttingDown() {
        return shuttingDown;
    }

    public boolean isTerminated() {
        return terminated;
    }
}

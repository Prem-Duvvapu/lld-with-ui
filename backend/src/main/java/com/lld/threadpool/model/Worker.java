package com.lld.threadpool.model;

/**
 * One real worker thread's run loop: pull a task from the owning {@link CustomThreadPool}, run it,
 * repeat, until {@link CustomThreadPool#takeTask} says there's nothing left to do. "Core" vs.
 * "non-core" is fixed at creation and only changes whether this worker waits forever for the next
 * task ({@link CustomThreadPool#takeTask} blocks indefinitely) or retires after
 * {@code keepAliveMillis} of idleness — the pool decides which kind to spawn, this class just
 * carries the flag.
 */
public class Worker implements Runnable {

    private final CustomThreadPool pool;
    private final boolean core;
    private final String name;
    private volatile Thread thread;
    private PoolTask firstTask;

    public Worker(CustomThreadPool pool, boolean core, String name, PoolTask firstTask) {
        this.pool = pool;
        this.core = core;
        this.name = name;
        this.firstTask = firstTask;
    }

    @Override
    public void run() {
        PoolTask task = firstTask;
        firstTask = null;
        while (task != null || (task = pool.takeTask(this)) != null) {
            pool.runTask(task, this);
            task = null;
        }
        pool.workerTerminated(this);
    }

    public boolean isCore() {
        return core;
    }

    public String getName() {
        return name;
    }

    public Thread getThread() {
        return thread;
    }

    void setThread(Thread thread) {
        this.thread = thread;
    }
}

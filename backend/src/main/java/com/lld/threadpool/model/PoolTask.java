package com.lld.threadpool.model;

/**
 * One unit of work submitted to a {@link CustomThreadPool}. Deliberately never returned directly
 * by the controller (RCA-049: its {@link #runnable} field has no Jackson-visible shape and would
 * either throw or need excluding) — only the flat DTOs in this package
 * ({@code SubmitResult}/{@code PoolStats}) ever leave the service layer.
 */
public class PoolTask {
    private final String id;
    private final String name;
    private final Runnable runnable;
    private final long submittedAtMillis;

    private volatile TaskStatus status = TaskStatus.QUEUED;
    private volatile String workerName;

    public PoolTask(String id, String name, Runnable runnable, long submittedAtMillis) {
        this.id = id;
        this.name = name;
        this.runnable = runnable;
        this.submittedAtMillis = submittedAtMillis;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Runnable getRunnable() {
        return runnable;
    }

    public long getSubmittedAtMillis() {
        return submittedAtMillis;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public String getWorkerName() {
        return workerName;
    }

    public void setWorkerName(String workerName) {
        this.workerName = workerName;
    }
}

package com.lld.jobscheduler.repository;

import com.lld.jobscheduler.exception.JobNotFoundException;
import com.lld.jobscheduler.model.Job;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Pure storage — a {@link ConcurrentHashMap} keyed by job id, genuinely thread-safe for the
 * single-key operations it exposes (unlike a plain {@code HashMap}, which only happens to work
 * here single-threaded). Dispatch ordering and per-job locking are {@code JobScheduler}'s job,
 * not this class's — this mirrors {@code SplitwiseRepository}/{@code UberRepository}: storage
 * and lookup only, no business rules.
 */
public class JobSchedulerRepository {
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public String nextId() {
        return "JOB-" + idGenerator.getAndIncrement();
    }

    public Job save(Job job) {
        jobs.put(job.getId(), job);
        return job;
    }

    /** {@code null} when absent — callers that need to fail loudly use {@link #getOrThrow}. */
    public Job findById(String id) {
        return jobs.get(id);
    }

    public Optional<Job> find(String id) {
        return Optional.ofNullable(jobs.get(id));
    }

    public Job getOrThrow(String id) {
        Job job = jobs.get(id);
        if (job == null) {
            throw new JobNotFoundException("Job not found: " + id);
        }
        return job;
    }

    public List<Job> findAll() {
        return new ArrayList<>(jobs.values());
    }

    public boolean delete(String id) {
        return jobs.remove(id) != null;
    }

    public void clear() {
        jobs.clear();
        idGenerator.set(1);
    }

    public int size() {
        return jobs.size();
    }
}

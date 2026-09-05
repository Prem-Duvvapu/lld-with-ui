package com.lld.jobscheduler.service;

import com.lld.jobscheduler.clock.Clock;
import com.lld.jobscheduler.exception.InvalidJobTransitionException;
import com.lld.jobscheduler.exception.InvalidScheduleException;
import com.lld.jobscheduler.misfire.MisfirePolicy;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobExecutionOutcome;
import com.lld.jobscheduler.model.JobExecutionRecord;
import com.lld.jobscheduler.model.JobStatus;
import com.lld.jobscheduler.repository.JobSchedulerRepository;
import com.lld.jobscheduler.schedule.Schedule;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.locks.ReentrantLock;

/**
 * The scheduling engine: a {@link PriorityBlockingQueue} of jobs ordered by
 * {@code nextExecutionTime}, and (for the live instance) a fixed worker-thread pool that
 * repeatedly polls it for due jobs and dispatches them. One instance backs the live
 * {@code /api/jobscheduler/*} endpoints (real {@link com.lld.jobscheduler.clock.SystemClock},
 * background workers running); a second, completely separate instance backs the isolated
 * {@code /sim/*} sandbox (a {@link com.lld.jobscheduler.clock.ManualClock}, no background
 * workers — dispatch only happens when the sandbox explicitly advances the clock), matching
 * {@code SplitwiseService}'s {@code repository}/{@code simRepository} split. Both are owned and
 * constructed by {@code JobSchedulerService}.
 *
 * <p><b>The race this module exists to demonstrate</b>: a job can be cancelled at the exact
 * instant a worker is popping it off the queue for execution. A naive
 * "peek due job -&gt; remove -&gt; execute" sequence can run a job that was already cancelled a
 * moment earlier, because cancellation and dispatch are two separate operations on the same job
 * with nothing serializing them against each other. This is guarded per-job: {@link #cancel} and
 * every dispatch path acquire the <b>same</b> {@code ReentrantLock}, keyed by job id
 * (mirrors {@code uber.service.DriverAssignmentService}'s per-driver lock), and dispatch
 * re-checks {@link Job#isCancelled()} <i>inside</i> that lock before doing anything else. Once a
 * job is popped off {@link #dueQueue} it is never visible to any other dispatcher, so the only
 * remaining race is exactly the one the lock closes: "was cancel() first, or was dispatch
 * first" — never "both ran".
 */
public class JobScheduler {

    private final Clock clock;
    private final Duration misfireThreshold;
    private final JobSchedulerRepository repository = new JobSchedulerRepository();
    private final PriorityBlockingQueue<Job> dueQueue =
            new PriorityBlockingQueue<>(64, java.util.Comparator.comparing(Job::getNextExecutionTime));
    private final Map<String, ReentrantLock> jobLocks = new ConcurrentHashMap<>();

    private final int workerCount;
    private volatile boolean running = false;
    private ExecutorService workerPool;

    public JobScheduler(Clock clock, Duration misfireThreshold, int workerCount) {
        this.clock = clock;
        this.misfireThreshold = misfireThreshold;
        this.workerCount = workerCount;
    }

    // =========================================================================
    // Worker pool lifecycle — live engine only. The sim engine never calls start();
    // it dispatches synchronously via dispatchDueNow() after advancing its ManualClock.
    // =========================================================================

    public synchronized void start() {
        if (running) {
            return;
        }
        running = true;
        workerPool = Executors.newFixedThreadPool(workerCount, r -> {
            Thread t = new Thread(r, "jobscheduler-worker");
            t.setDaemon(true);
            return t;
        });
        for (int i = 0; i < workerCount; i++) {
            workerPool.submit(this::pollLoop);
        }
    }

    public synchronized void shutdown() {
        running = false;
        if (workerPool != null) {
            workerPool.shutdownNow();
        }
    }

    private void pollLoop() {
        while (running) {
            try {
                Job head = dueQueue.peek();
                if (head == null || head.getNextExecutionTime().isAfter(clock.now())) {
                    Thread.sleep(50);
                    continue;
                }
                Job job = dueQueue.poll();
                if (job == null) {
                    continue;
                }
                dispatchPolled(job);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    // =========================================================================
    // Job lifecycle
    // =========================================================================

    public Job schedule(String name, String taskType, Schedule schedule, MisfirePolicy misfirePolicy, long simulatedDurationMillis) {
        Instant creationTime = clock.now();
        Instant first = schedule.nextExecutionTime(creationTime)
                .orElseThrow(() -> new InvalidScheduleException("schedule produced no future execution time"));
        Job job = Job.builder()
                .id(repository.nextId())
                .name(name)
                .taskType(taskType == null || taskType.isBlank() ? "GENERIC_TASK" : taskType)
                .simulatedDurationMillis(simulatedDurationMillis > 0 ? simulatedDurationMillis : 100)
                .schedule(schedule)
                .status(JobStatus.SCHEDULED)
                .nextExecutionTime(first)
                .misfirePolicy(misfirePolicy)
                .cancelled(false)
                .build();
        repository.save(job);
        dueQueue.offer(job);
        return job;
    }

    /**
     * Request cancellation. Acquires the same per-job lock dispatch does, so a cancel that
     * arrives while a dispatch is already inside its critical section for this job simply waits
     * its turn — the two are never interleaved.
     */
    public void cancel(String jobId) {
        Job job = repository.getOrThrow(jobId);
        ReentrantLock lock = lockFor(jobId);
        lock.lock();
        try {
            if (!job.getStatus().canTransitionTo(JobStatus.CANCELLED)) {
                throw new InvalidJobTransitionException(
                        "Job " + jobId + " cannot be cancelled from status " + job.getStatus());
            }
            job.setCancelled(true);
            job.transition(JobStatus.CANCELLED);
            dueQueue.remove(job); // best-effort cleanup; dispatch re-checks cancelled anyway
        } finally {
            lock.unlock();
        }
    }

    public Job getJob(String id) {
        return repository.getOrThrow(id);
    }

    public List<Job> getAllJobs() {
        return repository.findAll();
    }

    public List<JobExecutionRecord> getHistory(String id) {
        return repository.getOrThrow(id).getHistory();
    }

    public int size() {
        return repository.size();
    }

    // =========================================================================
    // Dispatch
    // =========================================================================

    /**
     * Pop and process every job currently due, synchronously, in this thread. Used by the
     * live poll loop's caller only indirectly (each poll loop iteration dispatches one job at a
     * time via {@link #dispatchPolled}); the sandbox calls this directly after advancing its
     * {@code ManualClock}, and tests call it for deterministic control. Returns how many jobs
     * were processed (executed or skipped-by-misfire) in this pass.
     */
    public int dispatchDueNow() {
        int dispatched = 0;
        while (true) {
            Job head = dueQueue.peek();
            if (head == null || head.getNextExecutionTime().isAfter(clock.now())) {
                break;
            }
            Job job = dueQueue.poll();
            if (job == null) {
                continue;
            }
            dispatchPolled(job);
            dispatched++;
        }
        return dispatched;
    }

    /** Entry point for a job already removed from {@link #dueQueue} (by a poll loop or the pass above). */
    private void dispatchPolled(Job job) {
        ReentrantLock lock = lockFor(job.getId());
        lock.lock();
        try {
            processDueJob(job);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Dispatch a specific job by id, if and only if it is currently due — the entry point the
     * concurrent cancel/dispatch race demo uses to race a targeted job's dispatch against its
     * cancellation, rather than whichever job happens to be at the head of the queue.
     */
    public boolean dispatchIfDue(String jobId) {
        Job job = repository.findById(jobId);
        if (job == null) {
            return false;
        }
        ReentrantLock lock = lockFor(jobId);
        lock.lock();
        try {
            if (job.getStatus() != JobStatus.SCHEDULED) {
                return false;
            }
            if (job.getNextExecutionTime().isAfter(clock.now())) {
                return false;
            }
            dueQueue.remove(job);
            processDueJob(job);
            return true;
        } finally {
            lock.unlock();
        }
    }

    /** Caller must hold {@code jobLocks} for {@code job.getId()}. */
    private void processDueJob(Job job) {
        if (job.isCancelled()) {
            // Cancelled after being popped off the queue but before we got the lock (or by
            // definition, if we reached here via dispatchIfDue, cancel() won the lock race
            // first). Either way: drop it, execute nothing, re-queue nothing.
            return;
        }
        Instant now = clock.now();
        Instant due = job.getNextExecutionTime();
        boolean misfired = due.plus(misfireThreshold).isBefore(now);
        if (misfired) {
            boolean shouldExecute = job.getMisfirePolicy().handleMisfire(job, now);
            if (!shouldExecute) {
                if (job.getStatus() == JobStatus.SCHEDULED) {
                    dueQueue.offer(job);
                }
                return;
            }
        }
        executeNow(job, due, now);
    }

    private void executeNow(Job job, Instant due, Instant firedAt) {
        job.transition(JobStatus.RUNNING);
        // No real arbitrary user code to run — "the work" is represented abstractly. A
        // taskType of FAILING_TASK always fails so the FAILED path (and its reschedule) can be
        // demonstrated and tested deterministically, without randomness.
        boolean succeeded = !"FAILING_TASK".equalsIgnoreCase(job.getTaskType());
        job.transition(succeeded ? JobStatus.COMPLETED : JobStatus.FAILED);
        job.getHistory().add(JobExecutionRecord.builder()
                .firedAt(firedAt)
                .status(succeeded ? JobExecutionOutcome.COMPLETED : JobExecutionOutcome.FAILED)
                .durationMillis(job.getSimulatedDurationMillis())
                .build());

        // Reschedule from the ORIGINALLY DUE time, not the actual (possibly late) fire time,
        // so a recurring schedule is self-correcting and doesn't drift under load.
        Optional<Instant> next = job.getSchedule().nextExecutionTime(due);
        if (next.isPresent()) {
            job.setNextExecutionTime(next.get());
            job.transition(JobStatus.SCHEDULED);
            dueQueue.offer(job);
        }
        // else: a one-time job's schedule is exhausted — stays COMPLETED/FAILED, terminal.
    }

    private ReentrantLock lockFor(String jobId) {
        return jobLocks.computeIfAbsent(jobId, k -> new ReentrantLock(true));
    }

    public Clock getClock() {
        return clock;
    }
}

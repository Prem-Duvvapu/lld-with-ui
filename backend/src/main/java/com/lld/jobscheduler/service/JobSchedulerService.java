package com.lld.jobscheduler.service;

import com.lld.jobscheduler.clock.ManualClock;
import com.lld.jobscheduler.clock.SystemClock;
import com.lld.jobscheduler.exception.InvalidScheduleException;
import com.lld.jobscheduler.misfire.MisfirePolicy;
import com.lld.jobscheduler.misfire.MisfirePolicyFactory;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobExecutionRecord;
import com.lld.jobscheduler.model.SimEvent;
import com.lld.jobscheduler.schedule.Schedule;
import com.lld.jobscheduler.schedule.ScheduleFactory;
import com.lld.jobscheduler.schedule.ScheduleType;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Facade the controller delegates to wholesale. Owns the live {@link JobScheduler} (real
 * {@link SystemClock}, background worker threads running, seeded by
 * {@code JobSchedulerInitializer}) plus a completely separate sandbox {@link JobScheduler} for
 * the {@code /sim/*} engine, driven by a {@link ManualClock} — matching
 * {@code SplitwiseService}'s {@code repository}/{@code simRepository} split.
 */
@Service
public class JobSchedulerService {
    private static final Duration LIVE_MISFIRE_THRESHOLD = Duration.ofSeconds(60);
    private static final Duration SIM_MISFIRE_THRESHOLD = Duration.ofSeconds(45);
    private static final int LIVE_WORKER_COUNT = 3;

    private final ScheduleFactory scheduleFactory;
    private final MisfirePolicyFactory misfirePolicyFactory;

    private final JobScheduler liveScheduler;

    private volatile JobScheduler simScheduler;
    private volatile ManualClock simClock;
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public JobSchedulerService(ScheduleFactory scheduleFactory, MisfirePolicyFactory misfirePolicyFactory) {
        this.scheduleFactory = scheduleFactory;
        this.misfirePolicyFactory = misfirePolicyFactory;
        this.liveScheduler = new JobScheduler(new SystemClock(), LIVE_MISFIRE_THRESHOLD, LIVE_WORKER_COUNT);
        this.liveScheduler.start();
        simReset();
    }

    @PreDestroy
    public void shutdown() {
        liveScheduler.shutdown();
    }

    // =========================================================================
    // LIVE OPERATIONS
    // =========================================================================

    public Job createJob(String name, String taskType, String scheduleTypeName, Map<String, Object> scheduleParams,
                          String misfirePolicyName, Long simulatedDurationMillis) {
        if (name == null || name.isBlank()) {
            throw new InvalidScheduleException("name must not be blank");
        }
        ScheduleType type = parseScheduleType(scheduleTypeName);
        Schedule schedule = scheduleFactory.create(type, scheduleParams, liveScheduler.getClock());
        MisfirePolicy policy = misfirePolicyFactory.get(misfirePolicyName);
        return liveScheduler.schedule(name, taskType, schedule, policy,
                simulatedDurationMillis == null ? 0 : simulatedDurationMillis);
    }

    public List<Job> getAllJobs() {
        return liveScheduler.getAllJobs();
    }

    public Job getJob(String id) {
        return liveScheduler.getJob(id);
    }

    public Job cancelJob(String id) {
        liveScheduler.cancel(id);
        return liveScheduler.getJob(id);
    }

    public List<JobExecutionRecord> getHistory(String id) {
        return liveScheduler.getHistory(id);
    }

    /** Walks the schedule forward {@code count} times without creating a job — the frontend's "next 3 fire times" preview. */
    public List<Instant> previewNextExecutions(String scheduleTypeName, Map<String, Object> scheduleParams, int count) {
        ScheduleType type = parseScheduleType(scheduleTypeName);
        Schedule schedule = scheduleFactory.create(type, scheduleParams, liveScheduler.getClock());
        List<Instant> result = new ArrayList<>();
        Instant from = liveScheduler.getClock().now();
        for (int i = 0; i < count; i++) {
            Optional<Instant> next = schedule.nextExecutionTime(from);
            if (next.isEmpty()) {
                break;
            }
            result.add(next.get());
            from = next.get();
        }
        return result;
    }

    private ScheduleType parseScheduleType(String name) {
        if (name == null) {
            throw new InvalidScheduleException("scheduleType must not be null");
        }
        try {
            return ScheduleType.valueOf(name.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidScheduleException("unknown scheduleType: " + name);
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE — separate JobScheduler + ManualClock, never touches live jobs
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        simClock = new ManualClock();
        simScheduler = new JobScheduler(simClock, SIM_MISFIRE_THRESHOLD, 1); // never start()ed — dispatch is manual/synchronous
        logSimEvent(1, "RESET", "SUCCESS", "Sandbox Reset",
                "Fresh sandbox scheduler on a ManualClock at t=" + simClock.now() + ". Misfire threshold: "
                        + SIM_MISFIRE_THRESHOLD.getSeconds() + "s.", Map.of());
        return getSimSnapshot();
    }

    public Map<String, Object> simScheduleOneTime(String name, String taskType, long delaySeconds, String misfirePolicyName, int step) {
        Schedule schedule = scheduleFactory.create(ScheduleType.ONE_TIME,
                Map.of("delaySeconds", delaySeconds), simClock);
        MisfirePolicy policy = misfirePolicyFactory.get(misfirePolicyName);
        Job job = simScheduler.schedule(name, taskType, schedule, policy, 150);
        logSimEvent(step, "JOB_SCHEDULED", "SUCCESS", "One-Time Job Scheduled",
                "'" + name + "' will fire once at " + job.getNextExecutionTime() + " (misfire policy: " + policy.getType() + ").",
                Map.of("jobId", job.getId(), "nextExecutionTime", job.getNextExecutionTime().toString()));
        return getSimSnapshot();
    }

    public Map<String, Object> simScheduleCron(String name, String taskType, String cronExpression, String misfirePolicyName, int step) {
        Schedule schedule = scheduleFactory.create(ScheduleType.CRON,
                Map.of("cronExpression", cronExpression), simClock);
        MisfirePolicy policy = misfirePolicyFactory.get(misfirePolicyName);
        Job job = simScheduler.schedule(name, taskType, schedule, policy, 150);
        logSimEvent(step, "JOB_SCHEDULED", "SUCCESS", "Cron Job Scheduled",
                "'" + name + "' (\"" + cronExpression + "\") next fires at " + job.getNextExecutionTime()
                        + " (misfire policy: " + policy.getType() + ").",
                Map.of("jobId", job.getId(), "nextExecutionTime", job.getNextExecutionTime().toString()));
        return getSimSnapshot();
    }

    public Map<String, Object> simAdvanceClock(long seconds, int step) {
        Instant before = simClock.now();
        simClock.advance(Duration.ofSeconds(seconds));
        int dispatched = simScheduler.dispatchDueNow();
        logSimEvent(step, "CLOCK_ADVANCED", "INFO", "Clock Advanced +" + seconds + "s",
                "Sandbox clock moved from " + before + " to " + simClock.now() + ". " + dispatched
                        + " job(s) processed (fired, rescheduled, or completed).",
                Map.of("dispatched", dispatched));
        return getSimSnapshot();
    }

    /** Advances the clock far past {@code jobId}'s due time and dispatches, so the configured MisfirePolicy actually runs. */
    public Map<String, Object> simTriggerMisfire(String jobId, long jumpSeconds, int step) {
        Job job = simScheduler.getJob(jobId);
        int historyBefore = job.getHistory().size();
        Instant before = simClock.now();
        simClock.advance(Duration.ofSeconds(jumpSeconds));
        int dispatched = simScheduler.dispatchDueNow();
        Job after = simScheduler.getJob(jobId);
        JobExecutionRecord newest = after.getHistory().size() > historyBefore
                ? after.getHistory().get(after.getHistory().size() - 1)
                : null;
        String outcome = newest == null ? "no new history entry" : newest.getStatus().toString();
        logSimEvent(step, "MISFIRE_TRIGGERED", "WARNING", "Misfire Forced",
                "Clock jumped from " + before + " to " + simClock.now() + " (" + jumpSeconds
                        + "s), far past '" + after.getName() + "'s due time. " + after.getMisfirePolicy().getType()
                        + " policy applied — outcome: " + outcome + ". Job status is now " + after.getStatus() + ".",
                Map.of("jobId", jobId, "dispatched", dispatched, "outcome", outcome, "status", after.getStatus().toString()));
        return getSimSnapshot();
    }

    public Map<String, Object> simCancelJob(String jobId, int step) {
        simScheduler.cancel(jobId);
        Job job = simScheduler.getJob(jobId);
        logSimEvent(step, "JOB_CANCELLED", "SUCCESS", "Job Cancelled",
                "'" + job.getName() + "' cancelled — it will never fire again.",
                Map.of("jobId", jobId));
        return getSimSnapshot();
    }

    /**
     * Live, one-shot demonstration of the module's centerpiece race: schedules a fresh job due
     * immediately, then races {@link JobScheduler#cancel} against {@link JobScheduler#dispatchIfDue}
     * for that exact job id on two threads released together. Exactly one of them "wins" — the
     * job either ends up CANCELLED (never executed) or COMPLETED (executed before the cancel
     * request landed) — and the response says which, proving the per-job lock, not just asserting
     * a happy path.
     */
    public Map<String, Object> simConcurrentCancelDispatchRace(int step) throws InterruptedException {
        Schedule schedule = scheduleFactory.create(ScheduleType.ONE_TIME, Map.of("delaySeconds", 1L), simClock);
        Job raceJob = simScheduler.schedule("Race Candidate", "GENERIC_TASK", schedule,
                misfirePolicyFactory.get("FIRE_IMMEDIATELY"), 50);
        simClock.advance(Duration.ofSeconds(1)); // make it due right now, before the race starts

        String jobId = raceJob.getId();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicBoolean cancelThrew = new AtomicBoolean(false);
        AtomicBoolean dispatchRan = new AtomicBoolean(false);

        pool.submit(() -> {
            try {
                start.await();
                simScheduler.cancel(jobId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (RuntimeException e) {
                cancelThrew.set(true); // dispatch already finished the job — cancelling a terminal job is rejected
            } finally {
                done.countDown();
            }
        });
        pool.submit(() -> {
            try {
                start.await();
                dispatchRan.set(simScheduler.dispatchIfDue(jobId));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        start.countDown();
        boolean finished = done.await(5, TimeUnit.SECONDS);
        pool.shutdown();

        Job after = simScheduler.getJob(jobId);
        String winner = after.getStatus().name().equals("CANCELLED") ? "CANCEL" : "DISPATCH";
        logSimEvent(step, "RACE", "SUCCESS", "Concurrent Cancel/Dispatch Race",
                "'" + after.getName() + "' (" + jobId + ") — cancel and dispatch fired at the same instant, "
                        + "serialized under its per-job lock. Winner: " + winner + ". Final status: " + after.getStatus()
                        + ". (finished cleanly: " + finished + ")",
                Map.of("jobId", jobId, "winner", winner, "finalStatus", after.getStatus().toString(),
                        "dispatchRan", dispatchRan.get(), "cancelRejected", cancelThrew.get()));
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("jobs", simScheduler.getAllJobs());
        snapshot.put("events", List.copyOf(simEvents));
        snapshot.put("now", simClock.now().toString());
        return snapshot;
    }

    private void logSimEvent(int step, String eventType, String status, String title, String description, Map<String, Object> details) {
        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step)
                .eventType(eventType)
                .status(status)
                .title(title)
                .description(description)
                .build();
        details.forEach(event::addDetail);
        simEvents.add(event);
    }
}

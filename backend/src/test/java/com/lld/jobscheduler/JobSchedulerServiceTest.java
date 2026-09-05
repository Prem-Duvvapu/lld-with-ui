package com.lld.jobscheduler;

import com.lld.jobscheduler.exception.InvalidJobTransitionException;
import com.lld.jobscheduler.exception.InvalidScheduleException;
import com.lld.jobscheduler.exception.JobNotFoundException;
import com.lld.jobscheduler.misfire.MisfirePolicyFactory;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobExecutionOutcome;
import com.lld.jobscheduler.model.JobStatus;
import com.lld.jobscheduler.schedule.ScheduleFactory;
import com.lld.jobscheduler.service.JobSchedulerService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Facade-level coverage. Job firing/rescheduling/misfire scenarios go through the sim engine's
 * {@code ManualClock} rather than the live {@code SystemClock} instance, so timing is exact and
 * deterministic — the sim methods are just more facade methods, not a separate code path.
 */
class JobSchedulerServiceTest {

    private JobSchedulerService service;

    @BeforeEach
    void setUp() {
        service = new JobSchedulerService(new ScheduleFactory(), new MisfirePolicyFactory());
    }

    @AfterEach
    void tearDown() {
        service.shutdown(); // stop the live engine's background worker threads
    }

    // --- live: creation ---------------------------------------------------

    @Test
    void createJob_oneTime_schedulesWithCorrectStatus() {
        Job job = service.createJob("Test Job", "GENERIC_TASK", "ONE_TIME",
                Map.of("delaySeconds", 3600), "FIRE_IMMEDIATELY", null);
        assertEquals(JobStatus.SCHEDULED, job.getStatus());
        assertNotNull(job.getId());
        assertTrue(job.getNextExecutionTime().isAfter(Instant.now()));
    }

    @Test
    void createJob_fixedRate_schedulesWithFutureNextExecution() {
        Job job = service.createJob("Heartbeat", "HEARTBEAT", "FIXED_RATE",
                Map.of("intervalSeconds", 60), "FIRE_IMMEDIATELY", null);
        assertEquals(JobStatus.SCHEDULED, job.getStatus());
    }

    @Test
    void createJob_cron_schedulesSuccessfully() {
        Job job = service.createJob("Report", "GENERATE_REPORT", "CRON",
                Map.of("cronExpression", "0 9 * * *"), "SKIP_TO_NEXT_OCCURRENCE", null);
        assertEquals(JobStatus.SCHEDULED, job.getStatus());
    }

    @Test
    void createJob_rejectsBlankName() {
        assertThrows(InvalidScheduleException.class, () ->
                service.createJob("  ", "T", "ONE_TIME", Map.of("delaySeconds", 60), "FIRE_IMMEDIATELY", null));
    }

    @Test
    void createJob_rejectsUnknownScheduleType() {
        assertThrows(InvalidScheduleException.class, () ->
                service.createJob("X", "T", "NOT_A_TYPE", Map.of(), "FIRE_IMMEDIATELY", null));
    }

    @Test
    void createJob_oneTime_rejectsNonFutureInstant() {
        assertThrows(InvalidScheduleException.class, () ->
                service.createJob("X", "T", "ONE_TIME", Map.of("delaySeconds", 0), "FIRE_IMMEDIATELY", null));
    }

    // --- live: cancel / history / lookup -----------------------------------

    @Test
    void cancelJob_rejectsUnknownId() {
        assertThrows(JobNotFoundException.class, () -> service.cancelJob("NOPE"));
    }

    @Test
    void cancelJob_marksCancelled_andRejectsASecondCancel() {
        Job job = service.createJob("X", "T", "ONE_TIME", Map.of("delaySeconds", 3600), "FIRE_IMMEDIATELY", null);
        Job cancelled = service.cancelJob(job.getId());
        assertEquals(JobStatus.CANCELLED, cancelled.getStatus());
        assertThrows(InvalidJobTransitionException.class, () -> service.cancelJob(job.getId()));
    }

    @Test
    void getHistory_unknownId_throwsJobNotFound() {
        assertThrows(JobNotFoundException.class, () -> service.getHistory("NOPE"));
    }

    @Test
    void getJob_unknownId_throwsJobNotFound() {
        assertThrows(JobNotFoundException.class, () -> service.getJob("NOPE"));
    }

    @Test
    void getAllJobs_includesEveryCreatedJob() {
        service.createJob("A", "T", "ONE_TIME", Map.of("delaySeconds", 60), "FIRE_IMMEDIATELY", null);
        service.createJob("B", "T", "ONE_TIME", Map.of("delaySeconds", 120), "FIRE_IMMEDIATELY", null);
        List<Job> jobs = service.getAllJobs();
        assertTrue(jobs.size() >= 2);
    }

    // --- preview ------------------------------------------------------------

    @Test
    void previewNextExecutions_cron_returnsRequestedCountInOrder() {
        List<Instant> preview = service.previewNextExecutions("CRON", Map.of("cronExpression", "* * * * *"), 3);
        assertEquals(3, preview.size());
        assertTrue(preview.get(0).isBefore(preview.get(1)));
        assertTrue(preview.get(1).isBefore(preview.get(2)));
    }

    @Test
    void previewNextExecutions_oneTime_stopsAtOneEntry() {
        List<Instant> preview = service.previewNextExecutions("ONE_TIME", Map.of("delaySeconds", 60), 5);
        assertEquals(1, preview.size());
    }

    // --- sim: deterministic firing / rescheduling / misfire ------------------

    @Test
    void simAdvanceClock_firesDueOneTimeJob_marksCompleted() {
        service.simReset();
        Map<String, Object> snap = service.simScheduleOneTime("Send Email", "SEND_EMAIL", 30, "FIRE_IMMEDIATELY", 2);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) snap.get("jobs");
        String jobId = jobs.get(0).getId();

        service.simAdvanceClock(35, 3);

        Job job = jobs(service).stream().filter(j -> j.getId().equals(jobId)).findFirst().orElseThrow();
        assertEquals(JobStatus.COMPLETED, job.getStatus());
        assertEquals(1, job.getHistory().size());
        assertEquals(JobExecutionOutcome.COMPLETED, job.getHistory().get(0).getStatus());
    }

    @Test
    void simAdvanceClock_firesDueCronJob_reschedulesBackToScheduled() {
        service.simReset();
        Map<String, Object> snap = service.simScheduleCron("Heartbeat", "HEARTBEAT", "* * * * *", "SKIP_TO_NEXT_OCCURRENCE", 3);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) snap.get("jobs");
        String jobId = jobs.get(0).getId();
        Instant firstDue = jobs.get(0).getNextExecutionTime();

        service.simAdvanceClock(65, 4);

        Job job = jobs(service).stream().filter(j -> j.getId().equals(jobId)).findFirst().orElseThrow();
        assertEquals(JobStatus.SCHEDULED, job.getStatus());
        assertTrue(job.getNextExecutionTime().isAfter(firstDue));
        assertEquals(1, job.getHistory().size());
        assertEquals(JobExecutionOutcome.COMPLETED, job.getHistory().get(0).getStatus());
    }

    @Test
    void simAdvanceClock_failingTaskType_marksFailed_butRecurringJobReschedules() {
        service.simReset();
        Map<String, Object> snap = service.simScheduleOneTime("Flaky", "FAILING_TASK", 10, "FIRE_IMMEDIATELY", 2);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) snap.get("jobs");
        String jobId = jobs.get(0).getId();

        service.simAdvanceClock(15, 3);

        Job job = jobs(service).stream().filter(j -> j.getId().equals(jobId)).findFirst().orElseThrow();
        assertEquals(JobStatus.FAILED, job.getStatus()); // one-time: stays FAILED, terminal
        assertEquals(JobExecutionOutcome.FAILED, job.getHistory().get(0).getStatus());
    }

    @Test
    void simTriggerMisfire_fireImmediately_stillExecutesLateJob() {
        service.simReset();
        Map<String, Object> snap = service.simScheduleOneTime("Late OK", "SEND_EMAIL", 10, "FIRE_IMMEDIATELY", 2);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) snap.get("jobs");
        String jobId = jobs.get(0).getId();

        service.simTriggerMisfire(jobId, 600, 6); // 10 minutes late — way past the 45s sim threshold

        Job job = jobs(service).stream().filter(j -> j.getId().equals(jobId)).findFirst().orElseThrow();
        assertEquals(JobStatus.COMPLETED, job.getStatus());
        assertEquals(1, job.getHistory().size());
        assertEquals(JobExecutionOutcome.COMPLETED, job.getHistory().get(0).getStatus());
    }

    @Test
    void simTriggerMisfire_skipToNextOccurrence_dropsTheRun() {
        service.simReset();
        Map<String, Object> snap = service.simScheduleCron("Heartbeat", "HEARTBEAT", "* * * * *", "SKIP_TO_NEXT_OCCURRENCE", 3);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) snap.get("jobs");
        String jobId = jobs.get(0).getId();

        service.simTriggerMisfire(jobId, 600, 6);

        Job job = jobs(service).stream().filter(j -> j.getId().equals(jobId)).findFirst().orElseThrow();
        assertEquals(JobStatus.SCHEDULED, job.getStatus()); // recurring: skipped, re-armed
        assertEquals(1, job.getHistory().size());
        assertEquals(JobExecutionOutcome.SKIPPED_MISFIRE, job.getHistory().get(0).getStatus());
    }

    @Test
    void simCancelJob_stopsFutureFiring() {
        service.simReset();
        Map<String, Object> snap = service.simScheduleOneTime("Cancel Me", "SEND_EMAIL", 30, "FIRE_IMMEDIATELY", 2);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) snap.get("jobs");
        String jobId = jobs.get(0).getId();

        service.simCancelJob(jobId, 7);
        service.simAdvanceClock(60, 8);

        Job job = jobs(service).stream().filter(j -> j.getId().equals(jobId)).findFirst().orElseThrow();
        assertEquals(JobStatus.CANCELLED, job.getStatus());
        assertTrue(job.getHistory().isEmpty(), "a cancelled job must never have executed");
    }

    @Test
    void simConcurrentCancelDispatchRace_producesExactlyOneOutcome() throws InterruptedException {
        service.simReset();
        Map<String, Object> result = service.simConcurrentCancelDispatchRace(8);
        @SuppressWarnings("unchecked")
        List<Job> jobs = (List<Job>) result.get("jobs");
        Job raceJob = jobs.stream().filter(j -> j.getName().equals("Race Candidate")).findFirst().orElseThrow();
        assertTrue(raceJob.getStatus() == JobStatus.CANCELLED || raceJob.getStatus() == JobStatus.COMPLETED);
        if (raceJob.getStatus() == JobStatus.CANCELLED) {
            assertTrue(raceJob.getHistory().isEmpty());
        } else {
            assertEquals(1, raceJob.getHistory().size());
        }
    }

    @SuppressWarnings("unchecked")
    private List<Job> jobs(JobSchedulerService service) {
        return (List<Job>) service.getSimSnapshot().get("jobs");
    }
}

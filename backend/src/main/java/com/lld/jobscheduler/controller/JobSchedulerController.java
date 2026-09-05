package com.lld.jobscheduler.controller;

import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobExecutionRecord;
import com.lld.jobscheduler.model.SimEvent;
import com.lld.jobscheduler.service.JobSchedulerService;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobscheduler")
@CrossOrigin(origins = "*")
public class JobSchedulerController {

    private final JobSchedulerService service;

    public JobSchedulerController(JobSchedulerService service) {
        this.service = service;
    }

    // =========================================================================
    // LIVE ENDPOINTS
    // =========================================================================

    @PostMapping("/jobs")
    public Job createJob(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> scheduleParams = (Map<String, Object>) body.get("scheduleParams");
        Object durationRaw = body.get("simulatedDurationMillis");
        Long duration = durationRaw == null ? null : ((Number) durationRaw).longValue();
        return service.createJob(
                (String) body.get("name"),
                (String) body.get("taskType"),
                (String) body.get("scheduleType"),
                scheduleParams,
                (String) body.get("misfirePolicy"),
                duration);
    }

    @GetMapping("/jobs")
    public List<Job> getAllJobs() {
        return service.getAllJobs();
    }

    @GetMapping("/jobs/{id}")
    public Job getJob(@PathVariable String id) {
        return service.getJob(id);
    }

    @PostMapping("/jobs/{id}/cancel")
    public Job cancelJob(@PathVariable String id) {
        return service.cancelJob(id);
    }

    @GetMapping("/jobs/{id}/history")
    public List<JobExecutionRecord> getHistory(@PathVariable String id) {
        return service.getHistory(id);
    }

    @PostMapping("/preview")
    public List<Instant> preview(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> scheduleParams = (Map<String, Object>) body.get("scheduleParams");
        int count = body.get("count") == null ? 3 : ((Number) body.get("count")).intValue();
        return service.previewNextExecutions((String) body.get("scheduleType"), scheduleParams, count);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS — separate sandbox, never touches live jobs
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        return service.simReset();
    }

    @PostMapping("/sim/schedule-one-time")
    public Map<String, Object> simScheduleOneTime(@RequestBody Map<String, Object> body) {
        int step = numberOr(body.get("step"), 2);
        long delaySeconds = numberOr(body.get("delaySeconds"), 30);
        return service.simScheduleOneTime(
                (String) body.getOrDefault("name", "Send Welcome Email"),
                (String) body.getOrDefault("taskType", "SEND_EMAIL"),
                delaySeconds,
                (String) body.get("misfirePolicy"),
                step);
    }

    @PostMapping("/sim/schedule-cron")
    public Map<String, Object> simScheduleCron(@RequestBody Map<String, Object> body) {
        int step = numberOr(body.get("step"), 3);
        return service.simScheduleCron(
                (String) body.getOrDefault("name", "Every-Minute Heartbeat"),
                (String) body.getOrDefault("taskType", "HEARTBEAT"),
                (String) body.getOrDefault("cronExpression", "* * * * *"),
                (String) body.get("misfirePolicy"),
                step);
    }

    @PostMapping("/sim/advance-clock")
    public Map<String, Object> simAdvanceClock(@RequestBody Map<String, Object> body) {
        int step = numberOr(body.get("step"), 4);
        long seconds = numberOr(body.get("seconds"), 65);
        return service.simAdvanceClock(seconds, step);
    }

    @PostMapping("/sim/trigger-misfire")
    public Map<String, Object> simTriggerMisfire(@RequestBody Map<String, Object> body) {
        int step = numberOr(body.get("step"), 6);
        long jumpSeconds = numberOr(body.get("jumpSeconds"), 600);
        return service.simTriggerMisfire((String) body.get("jobId"), jumpSeconds, step);
    }

    @PostMapping("/sim/cancel-job")
    public Map<String, Object> simCancelJob(@RequestBody Map<String, Object> body) {
        int step = numberOr(body.get("step"), 7);
        return service.simCancelJob((String) body.get("jobId"), step);
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody(required = false) Map<String, Object> body) throws InterruptedException {
        int step = body != null ? numberOr(body.get("step"), 8) : 8;
        return service.simConcurrentCancelDispatchRace(step);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.simGetEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshot();
    }

    private int numberOr(Object value, int fallback) {
        return value == null ? fallback : ((Number) value).intValue();
    }

    private long numberOr(Object value, long fallback) {
        return value == null ? fallback : ((Number) value).longValue();
    }
}

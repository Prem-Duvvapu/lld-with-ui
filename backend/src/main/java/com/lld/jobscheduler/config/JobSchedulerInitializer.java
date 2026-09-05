package com.lld.jobscheduler.config;

import com.lld.jobscheduler.service.JobSchedulerService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Seeds the live scheduler with realistic demo jobs through the real
 * {@code JobSchedulerService.createJob()} path — not written straight into a repository — so
 * first load exercises the same validation and scheduling a real client would.
 */
@Component
public class JobSchedulerInitializer {

    private final JobSchedulerService service;

    public JobSchedulerInitializer(JobSchedulerService service) {
        this.service = service;
    }

    @PostConstruct
    public void seed() {
        service.createJob(
                "Send Onboarding Email",
                "SEND_EMAIL",
                "ONE_TIME",
                Map.of("delaySeconds", 3600L),
                "FIRE_IMMEDIATELY",
                200L);

        service.createJob(
                "Sync Inventory Feed",
                "SYNC_INVENTORY",
                "FIXED_RATE",
                Map.of("intervalSeconds", 300L),
                "FIRE_IMMEDIATELY",
                500L);

        service.createJob(
                "Daily Sales Report",
                "GENERATE_REPORT",
                "CRON",
                Map.of("cronExpression", "0 9 * * *"),
                "SKIP_TO_NEXT_OCCURRENCE",
                1000L);
    }
}

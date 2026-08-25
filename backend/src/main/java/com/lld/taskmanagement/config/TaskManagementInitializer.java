package com.lld.taskmanagement.config;

import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.service.TaskService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds a few demo tasks onto the Main Board at boot (the board itself is created eagerly by
 * {@link TaskService}, matching vendingmachine/coffeemachine/trafficsignal's pattern of the
 * service owning its main aggregate and an initializer adding demo content around it), and
 * primes the isolated sim sandbox so the Simulation tab has seed data on first load.
 */
@Component
public class TaskManagementInitializer implements CommandLineRunner {

    private final TaskService service;

    public TaskManagementInitializer(TaskService service) {
        this.service = service;
    }

    @Override
    public void run(String... args) {
        int boardId = service.getMainBoard().getId();
        long now = System.currentTimeMillis();

        Task planning = service.createTask(boardId, "Draft Q3 roadmap", "Outline the next quarter's priorities.",
                Priority.HIGH, "Alicia", now + 3 * 86_400_000L);
        service.moveTask(planning.getId(), TaskStatus.IN_PROGRESS);

        Task bug = service.createTask(boardId, "Fix checkout race condition",
                "Two concurrent checkouts double-charge under load.", Priority.CRITICAL, "Marcus", now + 1 * 86_400_000L);
        service.moveTask(bug.getId(), TaskStatus.IN_PROGRESS);
        service.moveTask(bug.getId(), TaskStatus.REVIEW);

        service.createTask(boardId, "Update onboarding docs", "Add the new SSO flow to the docs.",
                Priority.LOW, null, now + 14 * 86_400_000L);

        Task shipped = service.createTask(boardId, "Migrate logging pipeline", "Move to structured JSON logs.",
                Priority.MEDIUM, "Priya", now - 1 * 86_400_000L);
        service.moveTask(shipped.getId(), TaskStatus.IN_PROGRESS);
        service.moveTask(shipped.getId(), TaskStatus.REVIEW);
        service.moveTask(shipped.getId(), TaskStatus.DONE);

        service.simReset();
    }
}

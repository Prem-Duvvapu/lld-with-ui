package com.lld.taskmanagement.strategy;

import com.lld.taskmanagement.model.Task;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/** Sorts by due date ascending — tasks with no due date sort last. Ties broken by priority, then FIFO. */
@Component
public class DueDateFirstStrategy implements TaskOrderingStrategy {

    @Override
    public String name() {
        return "Due Date First";
    }

    @Override
    public List<Task> order(List<Task> tasks) {
        return tasks.stream()
                .sorted(Comparator
                        .comparing((Task t) -> t.getDueDate() == null ? Long.MAX_VALUE : t.getDueDate())
                        .thenComparing(Comparator.comparingInt((Task t) -> t.getPriority().getWeight()).reversed())
                        .thenComparingLong(Task::getCreatedAt))
                .collect(Collectors.toList());
    }
}

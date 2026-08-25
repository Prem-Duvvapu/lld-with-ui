package com.lld.taskmanagement.strategy;

import com.lld.taskmanagement.model.Task;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/** Sorts by priority weight descending; within the same priority, oldest-created first. */
@Component
public class FifoWithinPriorityStrategy implements TaskOrderingStrategy {

    @Override
    public String name() {
        return "FIFO within Priority";
    }

    @Override
    public List<Task> order(List<Task> tasks) {
        return tasks.stream()
                .sorted(Comparator
                        .comparingInt((Task t) -> t.getPriority().getWeight()).reversed()
                        .thenComparingLong(Task::getCreatedAt))
                .collect(Collectors.toList());
    }
}

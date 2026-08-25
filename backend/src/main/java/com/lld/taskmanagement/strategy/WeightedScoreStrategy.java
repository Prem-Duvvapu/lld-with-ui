package com.lld.taskmanagement.strategy;

import com.lld.taskmanagement.model.Task;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Sorts by a composite score: priority weight (dominant term) plus an urgency bonus for a
 * deadline close to creation time. Deterministic per task — the urgency term is computed from
 * {@code dueDate - createdAt}, both fixed fields on the task, rather than from wall-clock "now",
 * so this strategy pins exactly in tests without a clock dependency.
 */
@Component
public class WeightedScoreStrategy implements TaskOrderingStrategy {

    static final double PRIORITY_MULTIPLIER = 100.0;
    static final double URGENCY_WINDOW_DAYS = 30.0;
    private static final double MILLIS_PER_DAY = 86_400_000.0;

    @Override
    public String name() {
        return "Weighted Score";
    }

    @Override
    public List<Task> order(List<Task> tasks) {
        return tasks.stream()
                .sorted(Comparator
                        .comparingDouble((Task t) -> -score(t))
                        .thenComparingLong(Task::getCreatedAt))
                .collect(Collectors.toList());
    }

    /** Public so the unit test can pin exact values without reflection. */
    public double score(Task t) {
        double base = t.getPriority().getWeight() * PRIORITY_MULTIPLIER;
        if (t.getDueDate() == null) {
            return base;
        }
        double daysToDeadline = Math.max(0.0, (t.getDueDate() - t.getCreatedAt()) / MILLIS_PER_DAY);
        double urgencyBonus = Math.max(0.0, URGENCY_WINDOW_DAYS - daysToDeadline);
        return base + urgencyBonus;
    }
}

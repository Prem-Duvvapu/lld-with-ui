package com.lld.taskmanagement;

import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.strategy.DueDateFirstStrategy;
import com.lld.taskmanagement.strategy.FifoWithinPriorityStrategy;
import com.lld.taskmanagement.strategy.OrderingPolicy;
import com.lld.taskmanagement.strategy.TaskOrderingStrategyFactory;
import com.lld.taskmanagement.strategy.WeightedScoreStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Pins the exact ordering each {@code TaskOrderingStrategy} produces. */
class TaskOrderingStrategyTest {

    private Task task(long id, Priority priority, long createdAt, Long dueDate) {
        return Task.builder().id(id).boardId(1).title("T" + id).description("")
                .status(TaskStatus.TODO).priority(priority).createdAt(createdAt).updatedAt(createdAt)
                .dueDate(dueDate).build();
    }

    // ------------------------------------------------------ FifoWithinPriority

    @Test
    @DisplayName("FIFO within priority: highest priority first, ties broken by createdAt ascending")
    void fifo_priorityThenCreatedAt() {
        Task low = task(1, Priority.LOW, 100, null);
        Task highLater = task(2, Priority.HIGH, 300, null);
        Task highEarlier = task(3, Priority.HIGH, 200, null);
        List<Task> ordered = new FifoWithinPriorityStrategy().order(List.of(low, highLater, highEarlier));
        assertEquals(List.of(3L, 2L, 1L), ordered.stream().map(Task::getId).toList());
    }

    @Test
    @DisplayName("FIFO within priority does not mutate the input list")
    void fifo_doesNotMutateInput() {
        List<Task> input = List.of(task(1, Priority.LOW, 100, null), task(2, Priority.HIGH, 50, null));
        List<Task> ordered = new FifoWithinPriorityStrategy().order(input);
        assertEquals(1L, input.get(0).getId(), "input order must be unchanged");
        assertEquals(2L, ordered.get(0).getId());
    }

    // ------------------------------------------------------------ DueDateFirst

    @Test
    @DisplayName("Due date first: earliest deadline first, no-due-date tasks sort last")
    void dueDateFirst_earliestFirst_noDueDateLast() {
        Task noDue = task(1, Priority.CRITICAL, 100, null);
        Task dueLater = task(2, Priority.LOW, 100, 5000L);
        Task dueSoon = task(3, Priority.LOW, 100, 1000L);
        List<Task> ordered = new DueDateFirstStrategy().order(List.of(noDue, dueLater, dueSoon));
        assertEquals(List.of(3L, 2L, 1L), ordered.stream().map(Task::getId).toList());
    }

    @Test
    @DisplayName("Due date first: same due date breaks tie by priority, then createdAt")
    void dueDateFirst_tieBreaksByPriorityThenCreatedAt() {
        Task lowLater = task(1, Priority.LOW, 300, 1000L);
        Task highSame = task(2, Priority.HIGH, 100, 1000L);
        Task lowEarlier = task(3, Priority.LOW, 200, 1000L);
        List<Task> ordered = new DueDateFirstStrategy().order(List.of(lowLater, highSame, lowEarlier));
        assertEquals(List.of(2L, 3L, 1L), ordered.stream().map(Task::getId).toList());
    }

    // --------------------------------------------------------- WeightedScore

    @Test
    @DisplayName("Weighted score: base = priority weight * 100 when there is no due date")
    void weightedScore_noDueDate_isBaseOnly() {
        WeightedScoreStrategy strategy = new WeightedScoreStrategy();
        Task critical = task(1, Priority.CRITICAL, 0, null);
        assertEquals(400.0, strategy.score(critical), 0.0001);
    }

    @Test
    @DisplayName("Weighted score: a deadline within the 30-day urgency window adds a bonus")
    void weightedScore_nearDeadline_addsUrgencyBonus() {
        WeightedScoreStrategy strategy = new WeightedScoreStrategy();
        long oneDayMs = 86_400_000L;
        // due 5 days after creation -> urgency bonus = 30 - 5 = 25
        Task soon = task(1, Priority.LOW, 0, 5 * oneDayMs);
        assertEquals(100.0 + 25.0, strategy.score(soon), 0.0001);
    }

    @Test
    @DisplayName("Weighted score: a deadline outside the urgency window adds no bonus")
    void weightedScore_farDeadline_noBonus() {
        WeightedScoreStrategy strategy = new WeightedScoreStrategy();
        long oneDayMs = 86_400_000L;
        Task far = task(1, Priority.LOW, 0, 60 * oneDayMs);
        assertEquals(100.0, strategy.score(far), 0.0001);
    }

    @Test
    @DisplayName("Weighted score orders a mixed board with priority dominant, urgency breaking ties within a priority band")
    void weightedScore_ordersDescendingByScore() {
        WeightedScoreStrategy strategy = new WeightedScoreStrategy();
        long oneDayMs = 86_400_000L;
        Task criticalFar = task(1, Priority.CRITICAL, 0, 60 * oneDayMs);   // 400
        Task lowUrgent = task(2, Priority.LOW, 0, 1 * oneDayMs);           // 100 + 29 = 129
        List<Task> ordered = strategy.order(List.of(lowUrgent, criticalFar));
        assertEquals(List.of(1L, 2L), ordered.stream().map(Task::getId).toList(),
                "priority weight (x100) dominates a same-priority-band urgency bonus (<=30)");
    }

    // ------------------------------------------------------------- Factory

    @Test
    @DisplayName("Factory resolves every declared policy to its matching strategy")
    void factory_resolvesEveryPolicy() {
        TaskOrderingStrategyFactory factory = new TaskOrderingStrategyFactory(
                new FifoWithinPriorityStrategy(), new DueDateFirstStrategy(), new WeightedScoreStrategy());

        assertInstanceOf(FifoWithinPriorityStrategy.class, factory.forPolicy(OrderingPolicy.FIFO_PRIORITY));
        assertInstanceOf(DueDateFirstStrategy.class, factory.forPolicy(OrderingPolicy.DUE_DATE_FIRST));
        assertInstanceOf(WeightedScoreStrategy.class, factory.forPolicy(OrderingPolicy.WEIGHTED_SCORE));
    }
}

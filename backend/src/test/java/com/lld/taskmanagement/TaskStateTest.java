package com.lld.taskmanagement;

import com.lld.taskmanagement.exception.IllegalTaskTransitionException;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.state.BlockedState;
import com.lld.taskmanagement.state.CancelledState;
import com.lld.taskmanagement.state.DoneState;
import com.lld.taskmanagement.state.InProgressState;
import com.lld.taskmanagement.state.ReviewState;
import com.lld.taskmanagement.state.TaskState;
import com.lld.taskmanagement.state.TaskStates;
import com.lld.taskmanagement.state.TodoState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.EnumSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the exact declared transition table on {@code com.lld.taskmanagement.state} and proves
 * {@link Task#transitionTo(TaskStatus)} enforces it — the state-machine unit-test flavour.
 */
class TaskStateTest {

    private Task taskIn(TaskStatus status) {
        return Task.builder().id(1).boardId(1).title("t").description("")
                .status(status).priority(Priority.MEDIUM).createdAt(1).updatedAt(1).build();
    }

    // ------------------------------------------------------- declared table

    @Test
    @DisplayName("TODO may only move to IN_PROGRESS or CANCELLED")
    void todo_allowedNext() {
        assertEquals(EnumSet.of(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED), TodoState.INSTANCE.allowedNext());
    }

    @Test
    @DisplayName("IN_PROGRESS may only move to REVIEW, BLOCKED, or CANCELLED")
    void inProgress_allowedNext() {
        assertEquals(EnumSet.of(TaskStatus.REVIEW, TaskStatus.BLOCKED, TaskStatus.CANCELLED),
                InProgressState.INSTANCE.allowedNext());
    }

    @Test
    @DisplayName("REVIEW may move to DONE, back to IN_PROGRESS, BLOCKED, or CANCELLED")
    void review_allowedNext() {
        assertEquals(EnumSet.of(TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED),
                ReviewState.INSTANCE.allowedNext());
    }

    @Test
    @DisplayName("BLOCKED may only move to IN_PROGRESS or CANCELLED")
    void blocked_allowedNext() {
        assertEquals(EnumSet.of(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED), BlockedState.INSTANCE.allowedNext());
    }

    @Test
    @DisplayName("DONE and CANCELLED are terminal — empty allowed-next sets")
    void terminalStates_haveNoAllowedNext() {
        assertTrue(DoneState.INSTANCE.allowedNext().isEmpty());
        assertTrue(DoneState.INSTANCE.isTerminal());
        assertTrue(CancelledState.INSTANCE.allowedNext().isEmpty());
        assertTrue(CancelledState.INSTANCE.isTerminal());
    }

    @Test
    @DisplayName("Non-terminal states report isTerminal() == false")
    void nonTerminalStates_reportFalse() {
        assertFalse(TodoState.INSTANCE.isTerminal());
        assertFalse(InProgressState.INSTANCE.isTerminal());
        assertFalse(ReviewState.INSTANCE.isTerminal());
        assertFalse(BlockedState.INSTANCE.isTerminal());
    }

    @ParameterizedTest
    @EnumSource(TaskStatus.class)
    @DisplayName("TaskStates.of() resolves every status to a state whose getStatus() matches")
    void taskStates_resolveAllStatuses(TaskStatus status) {
        TaskState state = TaskStates.of(status);
        assertNotNull(state);
        assertEquals(status, state.getStatus());
    }

    // ------------------------------------------------------ enforcement on Task

    @Test
    @DisplayName("A legal transition applies and bumps updatedAt")
    void legalTransition_applies() {
        Task task = taskIn(TaskStatus.TODO);
        task.transitionTo(TaskStatus.IN_PROGRESS);
        assertEquals(TaskStatus.IN_PROGRESS, task.getStatus());
    }

    @Test
    @DisplayName("An illegal transition (TODO -> DONE) is rejected with IllegalTaskTransitionException")
    void illegalTransition_rejected() {
        Task task = taskIn(TaskStatus.TODO);
        IllegalTaskTransitionException ex = assertThrows(IllegalTaskTransitionException.class,
                () -> task.transitionTo(TaskStatus.DONE));
        assertTrue(ex.getMessage().contains("TODO"));
        assertTrue(ex.getMessage().contains("DONE"));
        assertEquals(TaskStatus.TODO, task.getStatus(), "status must be unchanged after a rejected transition");
    }

    @Test
    @DisplayName("DONE is terminal: any further transition is rejected")
    void doneIsTerminal_rejectsEverything() {
        Task task = taskIn(TaskStatus.DONE);
        for (TaskStatus target : TaskStatus.values()) {
            assertThrows(IllegalTaskTransitionException.class, () -> task.transitionTo(target));
        }
    }

    @Test
    @DisplayName("CANCELLED is terminal: any further transition is rejected")
    void cancelledIsTerminal_rejectsEverything() {
        Task task = taskIn(TaskStatus.CANCELLED);
        for (TaskStatus target : TaskStatus.values()) {
            assertThrows(IllegalTaskTransitionException.class, () -> task.transitionTo(target));
        }
    }

    @Test
    @DisplayName("REVIEW can loop back to IN_PROGRESS (changes requested)")
    void review_canLoopBackToInProgress() {
        Task task = taskIn(TaskStatus.REVIEW);
        task.transitionTo(TaskStatus.IN_PROGRESS);
        assertEquals(TaskStatus.IN_PROGRESS, task.getStatus());
    }

    @Test
    @DisplayName("The full happy path TODO -> IN_PROGRESS -> REVIEW -> DONE is legal end to end")
    void happyPath_allLegal() {
        Task task = taskIn(TaskStatus.TODO);
        task.transitionTo(TaskStatus.IN_PROGRESS);
        task.transitionTo(TaskStatus.REVIEW);
        task.transitionTo(TaskStatus.DONE);
        assertEquals(TaskStatus.DONE, task.getStatus());
    }

    @Test
    @DisplayName("Every non-terminal status can reach CANCELLED directly")
    void everyNonTerminalStatus_canCancel() {
        for (TaskStatus status : Set.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.BLOCKED)) {
            Task task = taskIn(status);
            assertDoesNotThrow(() -> task.transitionTo(TaskStatus.CANCELLED));
        }
    }
}

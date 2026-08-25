package com.lld.taskmanagement;

import com.lld.taskmanagement.exception.BoardNotFoundException;
import com.lld.taskmanagement.exception.IllegalTaskTransitionException;
import com.lld.taskmanagement.exception.InvalidTaskOperationException;
import com.lld.taskmanagement.exception.TaskAlreadyAssignedException;
import com.lld.taskmanagement.exception.TaskNotFoundException;
import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.repository.TaskRepository;
import com.lld.taskmanagement.service.TaskService;
import com.lld.taskmanagement.strategy.DueDateFirstStrategy;
import com.lld.taskmanagement.strategy.FifoWithinPriorityStrategy;
import com.lld.taskmanagement.strategy.OrderingPolicy;
import com.lld.taskmanagement.strategy.TaskOrderingStrategyFactory;
import com.lld.taskmanagement.strategy.WeightedScoreStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Service-level tests: CRUD, the state machine wired through the service, boards, ordering, sim. */
class TaskServiceTest {

    private TaskService service;

    private TaskOrderingStrategyFactory newFactory() {
        return new TaskOrderingStrategyFactory(
                new FifoWithinPriorityStrategy(), new DueDateFirstStrategy(), new WeightedScoreStrategy());
    }

    @BeforeEach
    void setUp() {
        service = new TaskService(new TaskRepository(), newFactory());
    }

    // ------------------------------------------------------------- boards

    @Test
    @DisplayName("A Main Board exists as soon as the service is constructed")
    void mainBoard_existsEagerly() {
        Board main = service.getMainBoard();
        assertEquals("Main Board", main.getName());
        assertEquals(main, service.getBoard(main.getId()));
    }

    @Test
    @DisplayName("createBoard rejects a blank name")
    void createBoard_rejectsBlankName() {
        assertThrows(InvalidTaskOperationException.class, () -> service.createBoard(""));
        assertThrows(InvalidTaskOperationException.class, () -> service.createBoard(null));
    }

    @Test
    @DisplayName("getBoard on an unknown id throws BoardNotFoundException")
    void getBoard_unknownId_throws() {
        assertThrows(BoardNotFoundException.class, () -> service.getBoard(9999));
    }

    @Test
    @DisplayName("listBoards includes the Main Board plus any created board")
    void listBoards_includesAll() {
        service.createBoard("Sprint 2");
        List<Board> boards = service.listBoards();
        assertTrue(boards.stream().anyMatch(b -> b.getName().equals("Main Board")));
        assertTrue(boards.stream().anyMatch(b -> b.getName().equals("Sprint 2")));
    }

    // -------------------------------------------------------------- tasks

    @Test
    @DisplayName("createTask defaults to TODO status and MEDIUM priority")
    void createTask_defaults() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Write tests", "desc", null, null, null);
        assertEquals(TaskStatus.TODO, task.getStatus());
        assertEquals(Priority.MEDIUM, task.getPriority());
    }

    @Test
    @DisplayName("createTask rejects a blank title")
    void createTask_rejectsBlankTitle() {
        int boardId = service.getMainBoard().getId();
        assertThrows(InvalidTaskOperationException.class,
                () -> service.createTask(boardId, "  ", "desc", Priority.LOW, null, null));
    }

    @Test
    @DisplayName("createTask on an unknown board throws BoardNotFoundException")
    void createTask_unknownBoard_throws() {
        assertThrows(BoardNotFoundException.class,
                () -> service.createTask(9999, "Title", "desc", Priority.LOW, null, null));
    }

    @Test
    @DisplayName("getTask on an unknown id throws TaskNotFoundException")
    void getTask_unknownId_throws() {
        assertThrows(TaskNotFoundException.class, () -> service.getTask(9999));
    }

    @Test
    @DisplayName("moveTask applies a legal transition and rejects an illegal one")
    void moveTask_legalAppliesIllegalRejected() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Ship it", "desc", Priority.HIGH, null, null);

        Task moved = service.moveTask(task.getId(), TaskStatus.IN_PROGRESS);
        assertEquals(TaskStatus.IN_PROGRESS, moved.getStatus());

        assertThrows(IllegalTaskTransitionException.class, () -> service.moveTask(task.getId(), TaskStatus.DONE));
        assertEquals(TaskStatus.IN_PROGRESS, service.getTask(task.getId()).getStatus());
    }

    @Test
    @DisplayName("moveTask on an unknown task throws TaskNotFoundException")
    void moveTask_unknownTask_throws() {
        assertThrows(TaskNotFoundException.class, () -> service.moveTask(9999, TaskStatus.IN_PROGRESS));
    }

    @Test
    @DisplayName("updatePriority changes the priority and rejects a null priority")
    void updatePriority_works() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Task", "desc", Priority.LOW, null, null);
        Task updated = service.updatePriority(task.getId(), Priority.CRITICAL);
        assertEquals(Priority.CRITICAL, updated.getPriority());
        assertThrows(InvalidTaskOperationException.class, () -> service.updatePriority(task.getId(), null));
    }

    @Test
    @DisplayName("reassignTask unconditionally overwrites the assignee, even if already assigned")
    void reassignTask_overwritesUnconditionally() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Task", "desc", Priority.LOW, "Alice", null);
        Task reassigned = service.reassignTask(task.getId(), "Bob");
        assertEquals("Bob", reassigned.getAssignee());
    }

    @Test
    @DisplayName("claimTask succeeds only when currently unassigned")
    void claimTask_onlyWhenUnassigned() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Task", "desc", Priority.LOW, null, null);
        Task claimed = service.claimTask(task.getId(), "Carol");
        assertEquals("Carol", claimed.getAssignee());

        assertThrows(TaskAlreadyAssignedException.class, () -> service.claimTask(task.getId(), "Dave"));
    }

    @Test
    @DisplayName("claimTask rejects a blank actor")
    void claimTask_rejectsBlankActor() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Task", "desc", Priority.LOW, null, null);
        assertThrows(InvalidTaskOperationException.class, () -> service.claimTask(task.getId(), ""));
    }

    @Test
    @DisplayName("deleteTask removes the task; a second delete throws TaskNotFoundException")
    void deleteTask_removesAndIsIdempotentlyChecked() {
        int boardId = service.getMainBoard().getId();
        Task task = service.createTask(boardId, "Task", "desc", Priority.LOW, null, null);
        service.deleteTask(task.getId());
        assertThrows(TaskNotFoundException.class, () -> service.getTask(task.getId()));
        assertThrows(TaskNotFoundException.class, () -> service.deleteTask(task.getId()));
    }

    @Test
    @DisplayName("getTasksByBoard and getTasksByStatus scope correctly; unknown board throws")
    void getTasks_scoping() {
        int boardId = service.getMainBoard().getId();
        Task t1 = service.createTask(boardId, "T1", "d", Priority.LOW, null, null);
        service.createTask(boardId, "T2", "d", Priority.LOW, null, null);
        service.moveTask(t1.getId(), TaskStatus.IN_PROGRESS);

        assertEquals(2, service.getTasksByBoard(boardId).size());
        assertEquals(1, service.getTasksByStatus(boardId, TaskStatus.IN_PROGRESS).size());
        assertEquals(1, service.getTasksByStatus(boardId, TaskStatus.TODO).size());
        assertThrows(BoardNotFoundException.class, () -> service.getTasksByBoard(9999));
    }

    @Test
    @DisplayName("getOrderedTasks delegates to the selected strategy and rejects an unknown policy gracefully")
    void getOrderedTasks_delegatesToStrategy() {
        int boardId = service.getMainBoard().getId();
        service.createTask(boardId, "Low", "d", Priority.LOW, null, null);
        service.createTask(boardId, "Critical", "d", Priority.CRITICAL, null, null);

        List<Task> ordered = service.getOrderedTasks(boardId, OrderingPolicy.FIFO_PRIORITY);
        assertEquals("Critical", ordered.get(0).getTitle());
    }

    // ---------------------------------------------------------------- sim

    @Test
    @DisplayName("simReset seeds the isolated sandbox and never touches live data")
    void simReset_isolatedFromLive() {
        int boardId = service.getMainBoard().getId();
        service.createTask(boardId, "Live task", "d", Priority.LOW, null, null);

        Map<String, Object> snapshot = service.simReset();
        @SuppressWarnings("unchecked")
        List<Task> simTasks = (List<Task>) snapshot.get("tasks");
        assertFalse(simTasks.isEmpty());
        assertTrue(simTasks.stream().noneMatch(t -> t.getTitle().equals("Live task")));

        // Live board is unaffected by sim reset.
        assertEquals(1, service.getTasksByBoard(boardId).size());
    }

    @Test
    @DisplayName("simMove applies a legal move and rejects an illegal one, logging both as sim events")
    void simMove_legalAndIllegal() {
        Map<String, Object> snapshot = service.simReset();
        @SuppressWarnings("unchecked")
        List<Task> simTasks = (List<Task>) snapshot.get("tasks");
        Task todoTask = simTasks.stream().filter(t -> t.getStatus() == TaskStatus.TODO).findFirst().orElseThrow();

        service.simMove(todoTask.getId(), TaskStatus.IN_PROGRESS, 1);
        assertThrows(IllegalTaskTransitionException.class,
                () -> service.simMove(todoTask.getId(), TaskStatus.DONE, 2));

        assertTrue(service.simGetEvents().stream().anyMatch(e -> "MOVE_REJECTED".equals(e.getEventType())));
    }

    @Test
    @DisplayName("simOrder returns an orderedTasks list produced by the requested strategy")
    void simOrder_returnsOrderedTasks() {
        service.simReset();
        Map<String, Object> result = service.simOrder(OrderingPolicy.WEIGHTED_SCORE, 1);
        assertTrue(result.containsKey("orderedTasks"));
    }
}

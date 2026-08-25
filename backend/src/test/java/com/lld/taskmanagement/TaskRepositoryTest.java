package com.lld.taskmanagement;

import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TaskRepositoryTest {

    private TaskRepository repository;

    @BeforeEach
    void setUp() {
        repository = new TaskRepository();
    }

    private Board board(String name) {
        Board board = Board.builder().id(repository.nextBoardId()).name(name).createdAt(1).build();
        return repository.saveBoard(board);
    }

    private Task task(int boardId, String title, TaskStatus status) {
        Task task = Task.builder().id(repository.nextTaskId()).boardId(boardId).title(title)
                .description("").status(status).priority(Priority.MEDIUM).createdAt(1).updatedAt(1).build();
        return repository.saveTask(task);
    }

    @Test
    @DisplayName("Board and task ids are generated atomically, starting at 1")
    void idsGenerateSequentially() {
        assertEquals(1, repository.nextBoardId());
        assertEquals(2, repository.nextBoardId());
        assertEquals(1, repository.nextTaskId());
        assertEquals(2, repository.nextTaskId());
    }

    @Test
    @DisplayName("saveBoard/findBoardById round-trip; unknown id returns null")
    void board_saveAndFind() {
        Board saved = board("Sprint 1");
        assertEquals(saved, repository.findBoardById(saved.getId()));
        assertNull(repository.findBoardById(9999));
    }

    @Test
    @DisplayName("findAllBoards returns every saved board")
    void board_findAll() {
        board("A");
        board("B");
        assertEquals(2, repository.findAllBoards().size());
    }

    @Test
    @DisplayName("saveTask/findTaskById round-trip; unknown id returns null")
    void task_saveAndFind() {
        Board b = board("Board");
        Task saved = task(b.getId(), "Do the thing", TaskStatus.TODO);
        assertEquals(saved, repository.findTaskById(saved.getId()));
        assertNull(repository.findTaskById(9999));
    }

    @Test
    @DisplayName("findTasksByBoard only returns tasks on that board")
    void task_findByBoard() {
        Board b1 = board("B1");
        Board b2 = board("B2");
        task(b1.getId(), "T1", TaskStatus.TODO);
        task(b1.getId(), "T2", TaskStatus.TODO);
        task(b2.getId(), "T3", TaskStatus.TODO);

        List<Task> b1Tasks = repository.findTasksByBoard(b1.getId());
        assertEquals(2, b1Tasks.size());
        assertTrue(b1Tasks.stream().allMatch(t -> t.getBoardId() == b1.getId()));
    }

    @Test
    @DisplayName("findTasksByBoardAndStatus filters by both board and status")
    void task_findByBoardAndStatus() {
        Board b = board("Board");
        task(b.getId(), "Todo1", TaskStatus.TODO);
        task(b.getId(), "Todo2", TaskStatus.TODO);
        task(b.getId(), "Done1", TaskStatus.DONE);

        assertEquals(2, repository.findTasksByBoardAndStatus(b.getId(), TaskStatus.TODO).size());
        assertEquals(1, repository.findTasksByBoardAndStatus(b.getId(), TaskStatus.DONE).size());
        assertEquals(0, repository.findTasksByBoardAndStatus(b.getId(), TaskStatus.CANCELLED).size());
    }

    @Test
    @DisplayName("deleteTask removes it from findAllTasks and findById")
    void task_delete() {
        Board b = board("Board");
        Task t = task(b.getId(), "Gone soon", TaskStatus.TODO);
        repository.deleteTask(t.getId());
        assertNull(repository.findTaskById(t.getId()));
        assertTrue(repository.findAllTasks().stream().noneMatch(x -> x.getId() == t.getId()));
    }

    @Test
    @DisplayName("clear() wipes boards and tasks and resets id generators to 1")
    void clear_resetsEverything() {
        Board b = board("Board");
        task(b.getId(), "T", TaskStatus.TODO);

        repository.clear();

        assertTrue(repository.findAllBoards().isEmpty());
        assertTrue(repository.findAllTasks().isEmpty());
        assertEquals(1, repository.nextBoardId());
        assertEquals(1, repository.nextTaskId());
    }
}

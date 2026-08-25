package com.lld.taskmanagement.repository;

import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Plain storage: no locking or validation lives here — that is {@code TaskService}'s job.
 * A task's board membership is a {@code boardId} foreign key rather than the board embedding a
 * task collection directly, so a board and its tasks can never be mutated out of sync.
 *
 * <p>{@code TaskService} owns two instances of this class: one for live data, one rebuilt from
 * scratch on every {@code simReset()} for the isolated {@code /sim/*} sandbox — the same
 * isolated-instance shape as {@code TrafficRepository}/{@code Intersection}.
 */
@Repository
public class TaskRepository {

    private final Map<Long, Task> tasks = new ConcurrentHashMap<>();
    private final Map<Integer, Board> boards = new ConcurrentHashMap<>();
    private final AtomicLong taskIdGenerator = new AtomicLong(1);
    private final AtomicInteger boardIdGenerator = new AtomicInteger(1);

    public long nextTaskId() {
        return taskIdGenerator.getAndIncrement();
    }

    public int nextBoardId() {
        return boardIdGenerator.getAndIncrement();
    }

    public Board saveBoard(Board board) {
        boards.put(board.getId(), board);
        return board;
    }

    public Board findBoardById(int id) {
        return boards.get(id);
    }

    public List<Board> findAllBoards() {
        return new ArrayList<>(boards.values());
    }

    public Task saveTask(Task task) {
        tasks.put(task.getId(), task);
        return task;
    }

    public Task findTaskById(long id) {
        return tasks.get(id);
    }

    public List<Task> findAllTasks() {
        return new ArrayList<>(tasks.values());
    }

    public List<Task> findTasksByBoard(int boardId) {
        return tasks.values().stream()
                .filter(t -> t.getBoardId() == boardId)
                .collect(Collectors.toList());
    }

    public List<Task> findTasksByBoardAndStatus(int boardId, TaskStatus status) {
        return tasks.values().stream()
                .filter(t -> t.getBoardId() == boardId && t.getStatus() == status)
                .collect(Collectors.toList());
    }

    public void deleteTask(long id) {
        tasks.remove(id);
    }

    public void clear() {
        tasks.clear();
        boards.clear();
        taskIdGenerator.set(1);
        boardIdGenerator.set(1);
    }
}

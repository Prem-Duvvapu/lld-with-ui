package com.lld.taskmanagement.repository;

import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class TaskRepository {

    private final ConcurrentHashMap<Long, Task> tasks = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    private final Board board = new Board(1, "Main Board");

    public Task save(Task task) {
        if (task.getId() == 0) {
            task.setId(idCounter.getAndIncrement());
        }
        tasks.put(task.getId(), task);
        board.getTasks().put(task.getId(), task);
        return task;
    }

    public Task findById(long id) {
        return tasks.get(id);
    }

    public List<Task> findAllByStatus(TaskStatus status) {
        return tasks.values().stream()
                .filter(t -> t.getStatus() == status)
                .collect(Collectors.toList());
    }

    public List<Task> findAll() {
        return new ArrayList<>(tasks.values());
    }

    public void delete(long id) {
        tasks.remove(id);
        board.getTasks().remove(id);
    }

    public Board getBoard() {
        return board;
    }
}

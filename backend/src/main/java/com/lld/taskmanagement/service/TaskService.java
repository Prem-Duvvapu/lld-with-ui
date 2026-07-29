package com.lld.taskmanagement.service;

import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public Task createTask(String title, String description, Priority priority, String assignee) {
        Task task = new Task(0, title, description, priority, assignee);
        return repository.save(task);
    }

    public Task updateStatus(long id, TaskStatus status) {
        Task task = repository.findById(id);
        if (task == null) throw new IllegalArgumentException("Task not found: " + id);
        task.setStatus(status);
        return repository.save(task);
    }

    public Task updatePriority(long id, Priority priority) {
        Task task = repository.findById(id);
        if (task == null) throw new IllegalArgumentException("Task not found: " + id);
        task.setPriority(priority);
        return repository.save(task);
    }

    public Task updateAssignee(long id, String assignee) {
        Task task = repository.findById(id);
        if (task == null) throw new IllegalArgumentException("Task not found: " + id);
        task.setAssignee(assignee);
        return repository.save(task);
    }

    public List<Task> getTasksByStatus(TaskStatus status) {
        return repository.findAllByStatus(status);
    }

    public List<Task> getAllTasks() {
        return repository.findAll();
    }

    public Board getBoard() {
        return repository.getBoard();
    }

    public void deleteTask(long id) {
        repository.delete(id);
    }
}

package com.lld.taskmanagement.controller;

import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> createTask(@RequestBody Map<String, String> body) {
        try {
            String title = body.get("title");
            String description = body.get("description");
            Priority priority = Priority.valueOf(body.getOrDefault("priority", "MEDIUM").toUpperCase());
            String assignee = body.getOrDefault("assignee", "");
            Task task = service.createTask(title, description, priority, assignee);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable long id, @RequestParam String status) {
        try {
            Task task = service.updateStatus(id, TaskStatus.valueOf(status.toUpperCase()));
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/priority")
    public ResponseEntity<?> updatePriority(@PathVariable long id, @RequestParam String priority) {
        try {
            Task task = service.updatePriority(id, Priority.valueOf(priority.toUpperCase()));
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/assignee")
    public ResponseEntity<?> updateAssignee(@PathVariable long id, @RequestParam String assignee) {
        try {
            Task task = service.updateAssignee(id, assignee);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return service.getAllTasks();
    }

    @GetMapping("/status/{status}")
    public List<Task> getTasksByStatus(@PathVariable String status) {
        return service.getTasksByStatus(TaskStatus.valueOf(status.toUpperCase()));
    }

    @GetMapping("/board")
    public Board getBoard() {
        return service.getBoard();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable long id) {
        try {
            service.deleteTask(id);
            return ResponseEntity.ok(Map.of("message", "Task deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

package com.lld.taskmanagement.controller;

import com.lld.taskmanagement.exception.InvalidTaskOperationException;
import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.SimEvent;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.service.TaskService;
import com.lld.taskmanagement.strategy.OrderingPolicy;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Translates HTTP only — every decision (validation, locking, the state machine, strategy
 * dispatch) lives in {@link TaskService}. No try/catch here: {@code GlobalExceptionHandler}
 * turns every {@code TaskException} into the right HTTP status.
 */
@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    // ------------------------------------------------------------- boards

    @PostMapping("/boards")
    public Board createBoard(@RequestBody Map<String, String> body) {
        return service.createBoard(body.get("name"));
    }

    @GetMapping("/boards")
    public List<Board> listBoards() {
        return service.listBoards();
    }

    @GetMapping("/boards/{boardId}")
    public Board getBoard(@PathVariable int boardId) {
        return service.getBoard(boardId);
    }

    @GetMapping("/boards/{boardId}/tasks")
    public List<Task> getBoardTasks(@PathVariable int boardId, @RequestParam(required = false) String status) {
        if (status != null && !status.isBlank()) {
            return service.getTasksByStatus(boardId, parseStatus(status));
        }
        return service.getTasksByBoard(boardId);
    }

    @GetMapping("/boards/{boardId}/ordered")
    public List<Task> getOrderedTasks(@PathVariable int boardId,
                                      @RequestParam(defaultValue = "FIFO_PRIORITY") String policy) {
        return service.getOrderedTasks(boardId, parsePolicy(policy));
    }

    // -------------------------------------------------------------- tasks

    @PostMapping("/boards/{boardId}/tasks")
    public Task createTask(@PathVariable int boardId, @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");
        Priority priority = body.get("priority") == null ? Priority.MEDIUM : parsePriority(String.valueOf(body.get("priority")));
        String assignee = (String) body.get("assignee");
        Long dueDate = body.get("dueDate") == null ? null : Long.valueOf(String.valueOf(body.get("dueDate")));
        return service.createTask(boardId, title, description, priority, assignee, dueDate);
    }

    @GetMapping("/{id}")
    public Task getTask(@PathVariable long id) {
        return service.getTask(id);
    }

    @PutMapping("/{id}/status")
    public Task updateStatus(@PathVariable long id, @RequestParam String status) {
        return service.moveTask(id, parseStatus(status));
    }

    @PutMapping("/{id}/priority")
    public Task updatePriority(@PathVariable long id, @RequestParam String priority) {
        return service.updatePriority(id, parsePriority(priority));
    }

    @PutMapping("/{id}/assignee")
    public Task updateAssignee(@PathVariable long id, @RequestParam String assignee) {
        return service.reassignTask(id, assignee);
    }

    @PostMapping("/{id}/claim")
    public Task claimTask(@PathVariable long id, @RequestBody Map<String, String> body) {
        return service.claimTask(id, body.get("actor"));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteTask(@PathVariable long id) {
        service.deleteTask(id);
        return Map.of("message", "Task deleted");
    }

    // ---------------------------------------------------------------- sim

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        return service.simReset();
    }

    @GetMapping("/sim/state")
    public Map<String, Object> simState() {
        return service.getSimSnapshot();
    }

    @PostMapping("/sim/move")
    public Map<String, Object> simMove(@RequestBody Map<String, Object> body) {
        return service.simMove(longOf(body.get("taskId")), parseStatus(String.valueOf(body.get("status"))), intOf(body.get("step")));
    }

    @PostMapping("/sim/claim")
    public Map<String, Object> simClaim(@RequestBody Map<String, Object> body) {
        return service.simClaim(longOf(body.get("taskId")), String.valueOf(body.get("actor")), intOf(body.get("step")));
    }

    @PostMapping("/sim/order")
    public Map<String, Object> simOrder(@RequestBody Map<String, Object> body) {
        return service.simOrder(parsePolicy(String.valueOf(body.get("policy"))), intOf(body.get("step")));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/sim/claim-race")
    public Map<String, Object> simClaimRace(@RequestBody Map<String, Object> body) {
        List<String> actors = (List<String>) body.get("actors");
        return service.simClaimRace(longOf(body.get("taskId")), actors, intOf(body.get("step")));
    }

    @PostMapping("/sim/transition-race")
    public Map<String, Object> simTransitionRace(@RequestBody Map<String, Object> body) {
        return service.simTransitionRace(
                longOf(body.get("taskId")),
                parseStatus(String.valueOf(body.get("first"))),
                parseStatus(String.valueOf(body.get("second"))),
                intOf(body.get("step")));
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simEvents() {
        return service.simGetEvents();
    }

    // ------------------------------------------------------------ helpers

    private TaskStatus parseStatus(String status) {
        try {
            return TaskStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidTaskOperationException("Unknown status: " + status);
        }
    }

    private Priority parsePriority(String priority) {
        try {
            return Priority.valueOf(priority.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidTaskOperationException("Unknown priority: " + priority);
        }
    }

    private OrderingPolicy parsePolicy(String policy) {
        try {
            return OrderingPolicy.valueOf(policy.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidTaskOperationException("Unknown ordering policy: " + policy);
        }
    }

    private long longOf(Object o) {
        try {
            return Long.parseLong(String.valueOf(o));
        } catch (NumberFormatException e) {
            throw new InvalidTaskOperationException("taskId must be a number");
        }
    }

    private int intOf(Object o) {
        if (o == null) return 0;
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (NumberFormatException e) {
            throw new InvalidTaskOperationException("step must be a number");
        }
    }
}

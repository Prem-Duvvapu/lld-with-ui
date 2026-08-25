package com.lld.taskmanagement.service;

import com.lld.taskmanagement.exception.BoardNotFoundException;
import com.lld.taskmanagement.exception.IllegalTaskTransitionException;
import com.lld.taskmanagement.exception.InvalidTaskOperationException;
import com.lld.taskmanagement.exception.TaskAlreadyAssignedException;
import com.lld.taskmanagement.exception.TaskNotFoundException;
import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.SimEvent;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.repository.TaskRepository;
import com.lld.taskmanagement.strategy.OrderingPolicy;
import com.lld.taskmanagement.strategy.TaskOrderingStrategy;
import com.lld.taskmanagement.strategy.TaskOrderingStrategyFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade the controller delegates to wholesale. Owns one production {@link TaskRepository} (with
 * one eagerly-created "Main Board") plus every extra board {@code TaskManagementInitializer}
 * seeds, and a completely separate isolated sandbox repository for the {@code /sim/*} engine —
 * rebuilt from scratch on every {@link #simReset()}, so a demo run can never leak into another
 * and never touches production data. Same shape as {@code InventoryService} / {@code
 * TrafficSignalService}.
 *
 * <h2>Concurrency (the module's real race)</h2>
 * <p>Two actors moving or claiming the same task at the same time is the concrete check-then-act
 * race here: a naive "read current status, decide it's legal, write the new status" done without
 * a lock lets two concurrent callers both pass the legality check against the SAME stale status
 * and both "succeed" — even when their two targets are mutually exclusive (e.g. one wants DONE,
 * the other CANCELLED from the same REVIEW task). A fair per-task {@link ReentrantLock}
 * (computeIfAbsent, the same idiom as {@code InventoryService}/{@code DriverAssignmentService})
 * makes the read-check-write in {@link #doMoveTask} and {@link #doClaimTask} atomic: whichever
 * caller gets the lock first re-validates against the CURRENT status, the other finds the status
 * already moved and is rejected. See {@code TaskConcurrencyTest}.
 */
@Service
public class TaskService {

    private final TaskRepository repository;
    private final TaskOrderingStrategyFactory orderingFactory;
    private final Board mainBoard;
    private final ConcurrentHashMap<Long, ReentrantLock> taskLocks = new ConcurrentHashMap<>();

    // Isolated Simulation Sandbox
    private volatile TaskRepository simRepository;
    private volatile Board simBoard;
    private volatile ConcurrentHashMap<Long, ReentrantLock> simTaskLocks = new ConcurrentHashMap<>();
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public TaskService(TaskRepository repository, TaskOrderingStrategyFactory orderingFactory) {
        this.repository = repository;
        this.orderingFactory = orderingFactory;
        this.mainBoard = Board.builder()
                .id(repository.nextBoardId())
                .name("Main Board")
                .createdAt(System.currentTimeMillis())
                .build();
        repository.saveBoard(mainBoard);
        resetSandbox();
    }

    public Board getMainBoard() {
        return mainBoard;
    }

    // =========================================================================
    // BOARDS
    // =========================================================================

    public Board createBoard(String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidTaskOperationException("Board name is required");
        }
        Board board = Board.builder()
                .id(repository.nextBoardId())
                .name(name)
                .createdAt(System.currentTimeMillis())
                .build();
        repository.saveBoard(board);
        return board;
    }

    public List<Board> listBoards() {
        return repository.findAllBoards();
    }

    public Board getBoard(int boardId) {
        return requireBoard(repository, boardId);
    }

    // =========================================================================
    // TASKS (live)
    // =========================================================================

    public Task createTask(int boardId, String title, String description, Priority priority,
                            String assignee, Long dueDate) {
        return doCreateTask(repository, boardId, title, description, priority, assignee, dueDate);
    }

    public Task getTask(long taskId) {
        return requireTask(repository, taskId);
    }

    public List<Task> getTasksByBoard(int boardId) {
        requireBoard(repository, boardId);
        return repository.findTasksByBoard(boardId);
    }

    public List<Task> getTasksByStatus(int boardId, TaskStatus status) {
        requireBoard(repository, boardId);
        return repository.findTasksByBoardAndStatus(boardId, status);
    }

    public List<Task> getOrderedTasks(int boardId, OrderingPolicy policy) {
        requireBoard(repository, boardId);
        TaskOrderingStrategy strategy = requireStrategy(policy);
        return strategy.order(repository.findTasksByBoard(boardId));
    }

    /** Applies the state machine's declared transition table under this task's lock. */
    public Task moveTask(long taskId, TaskStatus target) {
        return doMoveTask(repository, taskLocks, taskId, target);
    }

    public Task updatePriority(long taskId, Priority priority) {
        if (priority == null) {
            throw new InvalidTaskOperationException("Priority is required");
        }
        ReentrantLock lock = lockFor(taskLocks, taskId);
        lock.lock();
        try {
            Task task = requireTask(repository, taskId);
            task.setPriority(priority);
            task.setUpdatedAt(System.currentTimeMillis());
            return repository.saveTask(task);
        } finally {
            lock.unlock();
        }
    }

    /** Unconditional reassignment — no exclusivity check. Contrast with {@link #claimTask}. */
    public Task reassignTask(long taskId, String assignee) {
        ReentrantLock lock = lockFor(taskLocks, taskId);
        lock.lock();
        try {
            Task task = requireTask(repository, taskId);
            task.setAssignee(assignee);
            task.setUpdatedAt(System.currentTimeMillis());
            return repository.saveTask(task);
        } finally {
            lock.unlock();
        }
    }

    /** Claim-if-unassigned — the other concurrency race. See {@link #doClaimTask}. */
    public Task claimTask(long taskId, String actor) {
        return doClaimTask(repository, taskLocks, taskId, actor);
    }

    public void deleteTask(long taskId) {
        requireTask(repository, taskId);
        repository.deleteTask(taskId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        resetSandbox();
        logSimEvent(1, "RESET", "SUCCESS", "Sandbox Reset",
                "SIM Board reseeded with " + simRepository.findTasksByBoard(simBoard.getId()).size() + " tasks.");
        return getSimSnapshot();
    }

    public Map<String, Object> simMove(long taskId, TaskStatus target, int step) {
        try {
            Task task = doMoveTask(simRepository, simTaskLocks, taskId, target);
            logSimEvent(step, "MOVE", "SUCCESS", "Task Moved",
                    "\"" + task.getTitle() + "\" moved to " + target + ".");
        } catch (IllegalTaskTransitionException ex) {
            logSimEvent(step, "MOVE_REJECTED", "ERROR", "Illegal Transition Rejected", ex.getMessage());
            throw ex;
        } catch (TaskNotFoundException ex) {
            logSimEvent(step, "MOVE_REJECTED", "ERROR", "Task Not Found", ex.getMessage());
            throw ex;
        }
        return getSimSnapshot();
    }

    public Map<String, Object> simClaim(long taskId, String actor, int step) {
        try {
            Task task = doClaimTask(simRepository, simTaskLocks, taskId, actor);
            logSimEvent(step, "CLAIM", "SUCCESS", "Task Claimed",
                    actor + " claimed \"" + task.getTitle() + "\".");
        } catch (RuntimeException ex) {
            logSimEvent(step, "CLAIM_REJECTED", "ERROR", "Claim Rejected", ex.getMessage());
            throw ex;
        }
        return getSimSnapshot();
    }

    public Map<String, Object> simOrder(OrderingPolicy policy, int step) {
        TaskOrderingStrategy strategy = requireStrategy(policy);
        List<Task> ordered = strategy.order(simRepository.findTasksByBoard(simBoard.getId()));
        logSimEvent(step, "ORDER", "INFO", "Board Reordered", "Applied \"" + strategy.name() + "\" ordering.");
        Map<String, Object> result = getSimSnapshot();
        result.put("orderedTasks", ordered);
        result.put("policy", strategy.name());
        return result;
    }

    /**
     * Fires {@code actors.size()} concurrent claims at ONE unassigned task via a
     * {@link CountDownLatch} so they genuinely race. Exactly one claim may land; the rest are
     * rejected with {@link TaskAlreadyAssignedException} — proves the per-task lock, not thread
     * scheduling luck, decides the winner.
     */
    public Map<String, Object> simClaimRace(long taskId, List<String> actors, int step) {
        if (actors == null || actors.size() < 2 || actors.size() > 20) {
            throw new InvalidTaskOperationException("actors must list between 2 and 20 names");
        }
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        List<String> winners = new CopyOnWriteArrayList<>();
        Thread[] threads = new Thread[actors.size()];
        for (int i = 0; i < actors.size(); i++) {
            String actor = actors.get(i);
            threads[i] = new Thread(() -> {
                try {
                    start.await();
                    doClaimTask(simRepository, simTaskLocks, taskId, actor);
                    succeeded.incrementAndGet();
                    winners.add(actor);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (TaskAlreadyAssignedException | TaskNotFoundException | InvalidTaskOperationException e) {
                    rejected.incrementAndGet();
                }
            }, "taskmanagement-sim-claimer-" + i);
            threads[i].start();
        }
        start.countDown();
        for (Thread t : threads) {
            try {
                t.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        Task after = requireTask(simRepository, taskId);
        String winner = winners.isEmpty() ? "none" : winners.get(0);
        logSimEvent(step, "CLAIM_RACE", "SUCCESS", actors.size() + "-Way Claim Race",
                actors.size() + " actors raced to claim \"" + after.getTitle() + "\": " + succeeded.get()
                        + " succeeded (" + winner + "), " + rejected.get() + " rejected.");

        Map<String, Object> result = getSimSnapshot();
        result.put("winner", winners.isEmpty() ? null : winners.get(0));
        result.put("succeeded", succeeded.get());
        result.put("rejected", rejected.get());
        return result;
    }

    /**
     * Fires two concurrent transitions with DIFFERENT terminal targets at ONE task via a
     * {@link CountDownLatch}. Exactly one may apply; the other must find the task already moved
     * and be rejected with {@link IllegalTaskTransitionException} — proves the per-task lock's
     * re-validation, not scheduling luck, decides the outcome.
     */
    public Map<String, Object> simTransitionRace(long taskId, TaskStatus first, TaskStatus second, int step) {
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        Thread t1 = new Thread(() -> raceAttempt(taskId, first, start, succeeded, rejected), "taskmanagement-sim-race-1");
        Thread t2 = new Thread(() -> raceAttempt(taskId, second, start, succeeded, rejected), "taskmanagement-sim-race-2");
        t1.start();
        t2.start();
        start.countDown();
        try {
            t1.join(5000);
            t2.join(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Task after = requireTask(simRepository, taskId);
        logSimEvent(step, "TRANSITION_RACE", "SUCCESS",
                "Concurrent Move to " + first + " vs " + second,
                "Two callers raced to move \"" + after.getTitle() + "\" to " + first + " and " + second
                        + " simultaneously: " + succeeded.get() + " applied (final=" + after.getStatus()
                        + "), " + rejected.get() + " rejected.");

        Map<String, Object> result = getSimSnapshot();
        result.put("succeeded", succeeded.get());
        result.put("rejected", rejected.get());
        result.put("finalStatus", after.getStatus());
        return result;
    }

    private void raceAttempt(long taskId, TaskStatus target, CountDownLatch start,
                             AtomicInteger succeeded, AtomicInteger rejected) {
        try {
            start.await();
            doMoveTask(simRepository, simTaskLocks, taskId, target);
            succeeded.incrementAndGet();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (IllegalTaskTransitionException | TaskNotFoundException e) {
            rejected.incrementAndGet();
        }
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("board", simBoard);
        snapshot.put("tasks", simRepository.findTasksByBoard(simBoard.getId()));
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    // =========================================================================
    // SHARED INTERNALS — live and sim both funnel through these so validation, locking and the
    // state machine can never drift between the two paths (the same idiom InventoryService uses).
    // =========================================================================

    private Task doCreateTask(TaskRepository repo, int boardId, String title, String description,
                              Priority priority, String assignee, Long dueDate) {
        requireBoard(repo, boardId);
        if (title == null || title.isBlank()) {
            throw new InvalidTaskOperationException("Task title is required");
        }
        long now = System.currentTimeMillis();
        Task task = Task.builder()
                .id(repo.nextTaskId())
                .boardId(boardId)
                .title(title)
                .description(description == null ? "" : description)
                .status(TaskStatus.TODO)
                .priority(priority == null ? Priority.MEDIUM : priority)
                .assignee(assignee)
                .dueDate(dueDate)
                .createdAt(now)
                .updatedAt(now)
                .build();
        repo.saveTask(task);
        return task;
    }

    private Task doMoveTask(TaskRepository repo, Map<Long, ReentrantLock> locks, long taskId, TaskStatus target) {
        ReentrantLock lock = lockFor(locks, taskId);
        lock.lock();
        try {
            Task task = requireTask(repo, taskId);
            // The whole check (inside Task#transitionTo) and the write happen while holding this
            // task's lock, so a second racing caller can only observe the status AFTER this one
            // has fully applied (or thrown) — never a half-applied state.
            task.transitionTo(target);
            repo.saveTask(task);
            return task;
        } finally {
            lock.unlock();
        }
    }

    private Task doClaimTask(TaskRepository repo, Map<Long, ReentrantLock> locks, long taskId, String actor) {
        if (actor == null || actor.isBlank()) {
            throw new InvalidTaskOperationException("actor is required to claim a task");
        }
        ReentrantLock lock = lockFor(locks, taskId);
        lock.lock();
        try {
            Task task = requireTask(repo, taskId);
            if (task.getAssignee() != null && !task.getAssignee().isBlank()) {
                throw new TaskAlreadyAssignedException(taskId, task.getAssignee());
            }
            task.setAssignee(actor);
            task.setUpdatedAt(System.currentTimeMillis());
            repo.saveTask(task);
            return task;
        } finally {
            lock.unlock();
        }
    }

    private ReentrantLock lockFor(Map<Long, ReentrantLock> locks, long taskId) {
        return locks.computeIfAbsent(taskId, id -> new ReentrantLock(true));
    }

    private Task requireTask(TaskRepository repo, long taskId) {
        Task task = repo.findTaskById(taskId);
        if (task == null) {
            throw new TaskNotFoundException(taskId);
        }
        return task;
    }

    private Board requireBoard(TaskRepository repo, int boardId) {
        Board board = repo.findBoardById(boardId);
        if (board == null) {
            throw new BoardNotFoundException(boardId);
        }
        return board;
    }

    private TaskOrderingStrategy requireStrategy(OrderingPolicy policy) {
        if (policy == null) {
            throw new InvalidTaskOperationException("An ordering policy is required");
        }
        TaskOrderingStrategy strategy = orderingFactory.forPolicy(policy);
        if (strategy == null) {
            throw new InvalidTaskOperationException("Unknown ordering policy: " + policy);
        }
        return strategy;
    }

    private void logSimEvent(int step, String type, String status, String title, String description) {
        simEvents.add(SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType(type).status(status).title(title).description(description)
                .build());
    }

    /** Rebuilds the sandbox from scratch: fresh repository, fresh board, fresh locks, fresh event log. */
    private void resetSandbox() {
        TaskRepository freshRepo = new TaskRepository();
        Board freshBoard = Board.builder()
                .id(freshRepo.nextBoardId())
                .name("SIM Board")
                .createdAt(System.currentTimeMillis())
                .build();
        freshRepo.saveBoard(freshBoard);
        seedSimTasks(freshRepo, freshBoard.getId());
        this.simRepository = freshRepo;
        this.simBoard = freshBoard;
        this.simTaskLocks = new ConcurrentHashMap<>();
        this.simEvents.clear();
        this.simEventIdGen.set(1);
    }

    /** Seeds four demo tasks, walking each through the real state machine to reach its seed status. */
    private void seedSimTasks(TaskRepository repo, int boardId) {
        long now = System.currentTimeMillis();
        seedTask(repo, boardId, "Design API contracts", Priority.HIGH, null,
                now - 2 * 86_400_000L, TaskStatus.TODO);
        seedTask(repo, boardId, "Implement auth middleware", Priority.CRITICAL, "Rahul",
                now + 1 * 86_400_000L, TaskStatus.IN_PROGRESS);
        seedTask(repo, boardId, "Write onboarding docs", Priority.LOW, null,
                now + 10 * 86_400_000L, TaskStatus.TODO);
        seedTask(repo, boardId, "Code review: payments", Priority.MEDIUM, "Zoe",
                now + 2 * 86_400_000L, TaskStatus.REVIEW);
    }

    private void seedTask(TaskRepository repo, int boardId, String title, Priority priority, String assignee,
                          long dueDate, TaskStatus targetStatus) {
        long now = System.currentTimeMillis();
        Task task = Task.builder()
                .id(repo.nextTaskId())
                .boardId(boardId)
                .title(title)
                .description("Seed task")
                .status(TaskStatus.TODO)
                .priority(priority)
                .assignee(assignee)
                .dueDate(dueDate)
                .createdAt(now)
                .updatedAt(now)
                .build();
        // Walk the real state machine to reach the seed status, rather than setting the field
        // directly, so even seed data proves the transition table holds.
        if (targetStatus == TaskStatus.IN_PROGRESS || targetStatus == TaskStatus.REVIEW) {
            task.transitionTo(TaskStatus.IN_PROGRESS);
        }
        if (targetStatus == TaskStatus.REVIEW) {
            task.transitionTo(TaskStatus.REVIEW);
        }
        repo.saveTask(task);
    }
}

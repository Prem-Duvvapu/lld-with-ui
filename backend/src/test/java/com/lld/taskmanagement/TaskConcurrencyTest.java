package com.lld.taskmanagement;

import com.lld.taskmanagement.exception.IllegalTaskTransitionException;
import com.lld.taskmanagement.exception.TaskAlreadyAssignedException;
import com.lld.taskmanagement.model.Board;
import com.lld.taskmanagement.model.Priority;
import com.lld.taskmanagement.model.Task;
import com.lld.taskmanagement.model.TaskStatus;
import com.lld.taskmanagement.repository.TaskRepository;
import com.lld.taskmanagement.service.TaskService;
import com.lld.taskmanagement.strategy.DueDateFirstStrategy;
import com.lld.taskmanagement.strategy.FifoWithinPriorityStrategy;
import com.lld.taskmanagement.strategy.TaskOrderingStrategyFactory;
import com.lld.taskmanagement.strategy.WeightedScoreStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the two real check-then-act races {@code TaskService} has: two actors racing to claim
 * the same unassigned task, and two actors racing to move the same task to two different
 * terminal statuses at once. Both are gated by a per-task {@link java.util.concurrent.locks.ReentrantLock}
 * whose check-and-write happens in one critical section — deleting the lock (or narrowing its
 * scope so the check is outside it) must make these tests fail.
 */
@DisplayName("TaskService Concurrency — per-task lock")
class TaskConcurrencyTest {

    private TaskService newService() {
        return new TaskService(new TaskRepository(), new TaskOrderingStrategyFactory(
                new FifoWithinPriorityStrategy(), new DueDateFirstStrategy(), new WeightedScoreStrategy()));
    }

    private Task newTask(TaskService service, TaskStatus status) {
        Board board = service.getMainBoard();
        Task task = service.createTask(board.getId(), "Race Task " + System.nanoTime(), "d", Priority.MEDIUM, null, null);
        if (status == TaskStatus.IN_PROGRESS || status == TaskStatus.REVIEW) {
            task = service.moveTask(task.getId(), TaskStatus.IN_PROGRESS);
        }
        if (status == TaskStatus.REVIEW) {
            task = service.moveTask(task.getId(), TaskStatus.REVIEW);
        }
        return task;
    }

    // ------------------------------------------------------- claim race

    @Test
    @DisplayName("N actors racing to claim one unassigned task: exactly one wins")
    void claimRace_onlyOneWins() throws InterruptedException {
        TaskService service = newService();
        Task task = newTask(service, TaskStatus.TODO);

        int actors = 12;
        ExecutorService pool = Executors.newFixedThreadPool(actors);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(actors);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < actors; i++) {
            String actor = "actor-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    service.claimTask(task.getId(), actor);
                    wins.incrementAndGet();
                } catch (TaskAlreadyAssignedException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "actors did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one actor may claim the task");
        assertEquals(actors - 1, rejections.get());
        assertNotNull(service.getTask(task.getId()).getAssignee());
    }

    @Test
    @DisplayName("Repeated claim race never produces two winners — 300 rounds")
    void claimRace_repeatedNeverTwoWinners() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            for (int round = 0; round < 300; round++) {
                TaskService service = newService();
                Task task = newTask(service, TaskStatus.TODO);

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(4);
                AtomicInteger wins = new AtomicInteger();

                for (int i = 0; i < 4; i++) {
                    String actor = "actor-" + i;
                    pool.submit(() -> {
                        try {
                            start.await();
                            service.claimTask(task.getId(), actor);
                            wins.incrementAndGet();
                        } catch (TaskAlreadyAssignedException expected) {
                            // lost the race — exactly right
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
                assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " winners instead of 1");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    // -------------------------------------------------- transition race

    @Test
    @DisplayName("Two callers racing DONE vs CANCELLED from REVIEW: exactly one applies cleanly")
    void transitionRace_exactlyOneApplies() throws InterruptedException {
        TaskService service = newService();
        Task task = newTask(service, TaskStatus.REVIEW);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        pool.submit(() -> {
            try {
                start.await();
                service.moveTask(task.getId(), TaskStatus.DONE);
                succeeded.incrementAndGet();
            } catch (IllegalTaskTransitionException expected) {
                rejected.incrementAndGet();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });
        pool.submit(() -> {
            try {
                start.await();
                service.moveTask(task.getId(), TaskStatus.CANCELLED);
                succeeded.incrementAndGet();
            } catch (IllegalTaskTransitionException expected) {
                rejected.incrementAndGet();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "transition race did not finish");
        pool.shutdown();

        assertEquals(1, succeeded.get(), "exactly one of the two racing transitions may apply");
        assertEquals(1, rejected.get());
        TaskStatus finalStatus = service.getTask(task.getId()).getStatus();
        assertTrue(finalStatus == TaskStatus.DONE || finalStatus == TaskStatus.CANCELLED,
                "final status must be a legal terminal outcome, never a torn/inconsistent one");
    }

    @Test
    @DisplayName("Repeated transition race never produces two winners — 300 rounds")
    void transitionRace_repeatedNeverTwoWinners() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            for (int round = 0; round < 300; round++) {
                TaskService service = newService();
                Task task = newTask(service, TaskStatus.REVIEW);

                CountDownLatch start = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger succeeded = new AtomicInteger();

                pool.submit(() -> {
                    try {
                        start.await();
                        service.moveTask(task.getId(), TaskStatus.DONE);
                        succeeded.incrementAndGet();
                    } catch (IllegalTaskTransitionException expected) {
                        // lost the race
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
                pool.submit(() -> {
                    try {
                        start.await();
                        service.moveTask(task.getId(), TaskStatus.CANCELLED);
                        succeeded.incrementAndGet();
                    } catch (IllegalTaskTransitionException expected) {
                        // lost the race
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });

                start.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
                assertEquals(1, succeeded.get(), "round " + round + " produced " + succeeded.get() + " winners instead of 1");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    @Test
    @DisplayName("Many concurrent identical move-to-DONE calls from REVIEW: exactly one succeeds")
    void manyIdenticalMoves_exactlyOneSucceeds() throws InterruptedException {
        TaskService service = newService();
        Task task = newTask(service, TaskStatus.REVIEW);

        int callers = 20;
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(callers);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < callers; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.moveTask(task.getId(), TaskStatus.DONE);
                    succeeded.incrementAndGet();
                } catch (IllegalTaskTransitionException expected) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "callers did not finish in time");
        pool.shutdown();

        assertEquals(1, succeeded.get(), "only the first caller may land DONE from REVIEW; the rest must find it already DONE");
        assertEquals(callers - 1, rejected.get());
        assertEquals(TaskStatus.DONE, service.getTask(task.getId()).getStatus());
    }

    @Test
    @DisplayName("Disjoint tasks do not contend — all succeed in parallel")
    void disjointTasks_allSucceed() throws InterruptedException {
        TaskService service = newService();
        int n = 6;
        long[] ids = new long[n];
        for (int i = 0; i < n; i++) {
            ids[i] = newTask(service, TaskStatus.TODO).getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();

        for (long id : ids) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.moveTask(id, TaskStatus.IN_PROGRESS);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "disjoint tasks did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "all disjoint task moves must succeed in parallel");
    }
}

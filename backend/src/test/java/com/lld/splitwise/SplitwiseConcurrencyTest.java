package com.lld.splitwise;

import com.lld.splitwise.model.*;
import com.lld.splitwise.repository.SplitwiseRepository;
import com.lld.splitwise.service.SplitwiseService;
import com.lld.splitwise.strategy.SplitStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Splitwise Concurrency & Thread Safety Tests")
public class SplitwiseConcurrencyTest {

    private SplitwiseService service;
    private User u1;
    private User u2;
    private User u3;
    private Group group;

    @BeforeEach
    void setUp() {
        SplitwiseRepository repository = new SplitwiseRepository();
        SplitStrategyFactory factory = new SplitStrategyFactory();
        service = new SplitwiseService(repository, factory);
        service.reset();

        u1 = service.createUser("Alice", "alice@test.com");
        u2 = service.createUser("Bob", "bob@test.com");
        u3 = service.createUser("Charlie", "charlie@test.com");

        group = service.createGroup("Flatmates", List.of(u1.getId(), u2.getId(), u3.getId()));
    }

    @Test
    @DisplayName("Concurrent Expenses: 30 concurrent expenses across 10 threads without lost updates")
    void testConcurrentExpenseAdditions() throws InterruptedException {
        int threadCount = 10;
        int expensesPerThread = 3;
        int totalExpenses = threadCount * expensesPerThread;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalExpenses);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < totalExpenses; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    // Alice pays ₹300 equally among 3 users (each member's share is ₹100, Bob and Charlie each owe Alice ₹100)
                    service.addExpense("Expense-" + index, 300.0, u1.getId(), group.getId(), List.of());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent expense threads should complete in 10s");
        assertEquals(totalExpenses, successCount.get(), "All 30 expenses should succeed");

        // Alice paid 30 * ₹300 = ₹9000.
        // Each expense: Bob owes ₹100, Charlie owes ₹100.
        // Total Bob owes Alice = 30 * 100 = ₹3000.
        // Total Charlie owes Alice = 30 * 100 = ₹3000.
        Map<String, Double> aliceBal = service.getBalances(u1.getId());
        assertEquals(3000.0, aliceBal.get("Bob"), 0.01, "Bob should owe Alice exactly ₹3000 under concurrent additions");
        assertEquals(3000.0, aliceBal.get("Charlie"), 0.01, "Charlie should owe Alice exactly ₹3000 under concurrent additions");

        Map<String, Double> bobBal = service.getBalances(u2.getId());
        assertEquals(-3000.0, bobBal.get("Alice"), 0.01, "Bob net balance should reflect -₹3000");
    }

    @Test
    @DisplayName("Concurrent Settle-Ups & Expenses: Simultaneous settlements and expenses maintain atomic consistency")
    void testConcurrentSettlementsAndExpenses() throws InterruptedException {
        // Seed initial balance: Alice pays ₹600 (Bob owes ₹200, Charlie owes ₹200)
        service.addExpense("Initial Dinner", 600.0, u1.getId(), group.getId(), List.of());

        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        // Thread 1: Bob settles ₹100 with Alice
        executor.submit(() -> {
            try {
                startLatch.await();
                service.settleUp(u2.getId(), u1.getId(), group.getId(), 100.0);
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 2: Bob settles remaining ₹100 with Alice
        executor.submit(() -> {
            try {
                startLatch.await();
                service.settleUp(u2.getId(), u1.getId(), group.getId(), 100.0);
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 3: Charlie settles ₹200 with Alice
        executor.submit(() -> {
            try {
                startLatch.await();
                service.settleUp(u3.getId(), u1.getId(), group.getId(), 200.0);
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 4: Bob pays ₹300 for the group (each owes ₹100)
        executor.submit(() -> {
            try {
                startLatch.await();
                service.addExpense("Snacks", 300.0, u2.getId(), group.getId(), List.of());
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "Concurrent operations must complete without deadlocks");

        // Verify total net balance across all 3 users sums to exactly 0.0
        double netSum = service.getAllUsers().stream()
                .flatMap(u -> service.getBalances(u.getId()).values().stream())
                .mapToDouble(Double::doubleValue)
                .sum();

        assertEquals(0.0, netSum, 0.01, "Sum of all net balances across all users must equal zero (conservation of balance)");
    }
}

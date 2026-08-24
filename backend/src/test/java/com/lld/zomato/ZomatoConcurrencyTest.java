package com.lld.zomato;

import com.lld.zomato.exception.NoAgentAvailableException;
import com.lld.zomato.model.Customer;
import com.lld.zomato.model.DeliveryAgent;
import com.lld.zomato.model.Order;
import com.lld.zomato.model.OrderItem;
import com.lld.zomato.model.OrderStatus;
import com.lld.zomato.model.Restaurant;
import com.lld.zomato.repository.ZomatoRepository;
import com.lld.zomato.service.DeliveryAssignmentService;
import com.lld.zomato.service.ZomatoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards against the check-then-act race in delivery agent assignment.
 *
 * <p>Section 9.1 verification: Removing the per-agent lock in DeliveryAssignmentService
 * and inserting Thread.sleep(2) between check and write MUST cause these tests to go red.
 */
@DisplayName("Zomato Concurrency — Delivery Agent Assignment Races")
class ZomatoConcurrencyTest {

    private ZomatoRepository repository;
    private DeliveryAssignmentService assignmentService;
    private ZomatoService service;

    @BeforeEach
    void setUp() {
        repository = new ZomatoRepository();
        assignmentService = new DeliveryAssignmentService(repository);
        service = new ZomatoService(repository, assignmentService);

        // Seed 1 agent
        repository.saveDeliveryAgent(new DeliveryAgent("AGENT-1", "Fast Agent", "9999999999", "KA-01-1234", true));

        // Seed customer & restaurant
        repository.saveCustomer(new Customer("CUST-1", "Alice", "alice@example.com", "9876543210", "1st Main"));
        List<com.lld.zomato.model.MenuItem> menu = List.of(new com.lld.zomato.model.MenuItem("M1", "Burger", "Tasty", 100.0, "Burgers", true, true));
        repository.saveRestaurant(new Restaurant("REST-1", "Burger King", "MG Road", "Fast Food", 4.5, true, menu));
    }

    private Order createReadyOrder(String orderId) {
        Order order = new Order();
        order.setId(orderId);
        order.setCustomerId("CUST-1");
        order.setRestaurantId("REST-1");
        order.setRestaurantName("Burger King");
        order.setStatus(OrderStatus.READY_FOR_PICKUP);
        repository.saveOrder(order);
        return order;
    }

    @Test
    @DisplayName("Two orders racing for one agent: exactly one wins")
    void twoOrdersRacingForOneAgent_onlyOneWins() throws InterruptedException {
        createReadyOrder("ORD-1");
        createReadyOrder("ORD-2");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        for (int i = 1; i <= 2; i++) {
            final String orderId = "ORD-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    assignmentService.assign(orderId, "AGENT-1");
                    wins.incrementAndGet();
                } catch (NoAgentAvailableException e) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "Exactly one order must win the agent");
        assertEquals(1, rejections.get(), "The other order must be rejected");
    }

    @Test
    @DisplayName("Twenty orders racing for one agent: nineteen rejected")
    void twentyOrdersOneAgent_nineteenRejected() throws InterruptedException {
        int n = 20;
        for (int i = 1; i <= n; i++) {
            createReadyOrder("ORD-" + i);
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        for (int i = 1; i <= n; i++) {
            final String orderId = "ORD-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    assignmentService.assign(orderId, "AGENT-1");
                    wins.incrementAndGet();
                } catch (NoAgentAvailableException e) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "Exactly one order must win the agent");
        assertEquals(n - 1, rejections.get(), "All other 19 orders must be rejected");
    }

    @Test
    @DisplayName("Disjoint assignments all succeed in parallel — proves per-agent locks")
    void disjointAssignmentsAllSucceed() throws InterruptedException {
        int n = 6;
        for (int i = 1; i <= n; i++) {
            repository.saveDeliveryAgent(new DeliveryAgent("AGENT-" + i, "Agent " + i, "999999999" + i, "KA-01-" + i, true));
            createReadyOrder("ORD-" + i);
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger(0);

        for (int i = 1; i <= n; i++) {
            final String orderId = "ORD-" + i;
            final String agentId = "AGENT-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    assignmentService.assign(orderId, agentId);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "All 6 disjoint agent assignments must succeed in parallel");
    }

    @Test
    @DisplayName("assignAgent: five orders racing for one agent — exactly one wins")
    void fiveOrdersRacingForOneAgentViaAssignAgent_onlyOneWins() throws InterruptedException {
        int n = 5;
        for (int i = 1; i <= n; i++) {
            createReadyOrder("ORD-" + i);
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger(0);
        AtomicInteger rejections = new AtomicInteger(0);

        for (int i = 1; i <= n; i++) {
            final String orderId = "ORD-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    assignmentService.assignAgent(orderId);
                    wins.incrementAndGet();
                } catch (NoAgentAvailableException e) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "Exactly one order must win the agent via assignAgent's pool scan");
        assertEquals(n - 1, rejections.get(), "All other orders must be rejected with NoAgentAvailableException");
    }

    @Test
    @DisplayName("assignAgent: M orders racing for M agents — all succeed with distinct agents")
    void disjointAssignAgentCallsAllSucceedWithDistinctAgents() throws InterruptedException {
        int n = 6;
        for (int i = 1; i <= n; i++) {
            repository.saveDeliveryAgent(new DeliveryAgent("POOL-AGENT-" + i, "Pool Agent " + i, "888888888" + i, "KA-02-" + i, true));
            createReadyOrder("POOL-ORD-" + i);
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        ConcurrentLinkedQueue<String> claimedAgentIds = new ConcurrentLinkedQueue<>();

        for (int i = 1; i <= n; i++) {
            final String orderId = "POOL-ORD-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    DeliveryAgent agent = assignmentService.assignAgent(orderId);
                    claimedAgentIds.add(agent.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "Threads did not finish in time");
        pool.shutdown();

        assertEquals(n, claimedAgentIds.size(), "All " + n + " assignAgent calls must succeed under contention");
        assertEquals(n, new java.util.HashSet<>(claimedAgentIds).size(),
                "The pool scan must not double-claim the same agent for two different orders");
    }

    @Test
    @DisplayName("assignAgent: repeated race never produces two winners — 300 rounds")
    void repeatedAssignAgentRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            ZomatoRepository freshRepo = new ZomatoRepository();
            DeliveryAssignmentService freshAssign = new DeliveryAssignmentService(freshRepo);
            freshRepo.saveDeliveryAgent(new DeliveryAgent("AGENT-1", "Agent", "9999999999", "KA-01-1234", true));

            Order o1 = new Order();
            o1.setId("ORD-1");
            o1.setStatus(OrderStatus.READY_FOR_PICKUP);
            freshRepo.saveOrder(o1);

            Order o2 = new Order();
            o2.setId("ORD-2");
            o2.setStatus(OrderStatus.READY_FOR_PICKUP);
            freshRepo.saveOrder(o2);

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger(0);

            for (int i = 1; i <= 2; i++) {
                final String orderId = "ORD-" + i;
                pool.submit(() -> {
                    try {
                        start.await();
                        freshAssign.assignAgent(orderId);
                        wins.incrementAndGet();
                    } catch (NoAgentAvailableException expected) {
                        // Expected rejection
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "Round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, wins.get(), "Round " + round + " produced " + wins.get() + " winners instead of 1 via assignAgent");
        }
    }

    @Test
    @DisplayName("Repeated race never produces two winners — 300 rounds")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            ZomatoRepository freshRepo = new ZomatoRepository();
            DeliveryAssignmentService freshAssign = new DeliveryAssignmentService(freshRepo);
            freshRepo.saveDeliveryAgent(new DeliveryAgent("AGENT-1", "Agent", "9999999999", "KA-01-1234", true));

            Order o1 = new Order();
            o1.setId("ORD-1");
            o1.setStatus(OrderStatus.READY_FOR_PICKUP);
            freshRepo.saveOrder(o1);

            Order o2 = new Order();
            o2.setId("ORD-2");
            o2.setStatus(OrderStatus.READY_FOR_PICKUP);
            freshRepo.saveOrder(o2);

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger(0);

            for (int i = 1; i <= 2; i++) {
                final String orderId = "ORD-" + i;
                pool.submit(() -> {
                    try {
                        start.await();
                        freshAssign.assign(orderId, "AGENT-1");
                        wins.incrementAndGet();
                    } catch (NoAgentAvailableException expected) {
                        // Expected rejection
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "Round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, wins.get(), "Round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }

    @Test
    @DisplayName("Released agent can be reclaimed once")
    void releasedAgentCanBeReclaimedOnce() {
        createReadyOrder("ORD-1");
        createReadyOrder("ORD-2");

        assignmentService.assign("ORD-1", "AGENT-1");
        assertFalse(repository.getDeliveryAgent("AGENT-1").isAvailable());

        assignmentService.releaseAgent("AGENT-1");
        assertTrue(repository.getDeliveryAgent("AGENT-1").isAvailable());

        // Reclaim
        assignmentService.assign("ORD-2", "AGENT-1");
        assertFalse(repository.getDeliveryAgent("AGENT-1").isAvailable());
    }

    @Test
    @DisplayName("Release is null safe")
    void releaseIsNullSafe() {
        assertDoesNotThrow(() -> assignmentService.releaseAgent(null));
        assertDoesNotThrow(() -> assignmentService.releaseAgent("NON-EXISTENT"));
    }

    @Test
    @DisplayName("simRace always produces exactly one winner across 25 rounds")
    void simRace_alwaysProducesExactlyOneWinner() {
        for (int round = 0; round < 25; round++) {
            Map<String, Object> result = service.simRace("AGENT-201", 5);

            assertEquals(5, result.get("attempts"), "round " + round);
            assertEquals(4L, result.get("rejected"), "round " + round + " must reject all but one");
            assertNotEquals("none", result.get("winner"), "round " + round + " must have a winner");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("results");
            long won = rows.stream().filter(r -> "WON".equals(r.get("outcome"))).count();
            assertEquals(1, won, "round " + round + " handed agent to " + won + " orders");
            assertEquals(5, rows.size(), "round " + round + " must report every attempt");
        }
    }
}

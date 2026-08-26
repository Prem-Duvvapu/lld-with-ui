package com.lld.elevator;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import com.lld.elevator.model.Request;
import com.lld.elevator.observer.ElevatorNotifier;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.service.ElevatorControllerService;
import com.lld.elevator.strategy.ElevatorDispatchStrategyFactory;
import com.lld.elevator.strategy.LookScanDispatchStrategy;
import com.lld.elevator.strategy.NearestCarDispatchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the real races an elevator dispatcher has to survive: many simultaneous floor requests
 * must all be recorded exactly once, no car may ever be handed conflicting/duplicated stops, and
 * concurrently toggling one car's state machine must never leave it in an invalid state — all
 * with real threads and a {@link CountDownLatch}, never a sleep-and-hope.
 */
public class ElevatorConcurrencyTest {

    private ElevatorRepository repository;
    private ElevatorControllerService controller;

    @BeforeEach
    public void setUp() {
        repository = new ElevatorRepository();
        repository.init();
        ElevatorDispatchStrategyFactory factory =
                new ElevatorDispatchStrategyFactory(new LookScanDispatchStrategy(), new NearestCarDispatchStrategy());
        ElevatorNotifier notifier = new ElevatorNotifier();
        controller = new ElevatorControllerService(repository, factory, notifier);
    }

    @Test
    public void test10ConcurrentRequestsNoDeadlockOrOverflow() throws Exception {
        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);
        List<Future<Request>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            final int source = (i % 10) + 1;
            final int destination = source <= 5 ? source + 5 : source - 5;

            futures.add(executor.submit(() -> {
                latch.await(); // Synchronize all 10 threads to fire simultaneously
                return controller.handleExternalRequest(source, destination);
            }));
        }

        latch.countDown(); // Release all 10 threads concurrently

        List<Request> results = new ArrayList<>();
        for (Future<Request> future : futures) {
            results.add(future.get(5, TimeUnit.SECONDS));
        }

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(numThreads, results.size());
        assertEquals(numThreads, repository.getAllRequests().size(), "no request was lost");

        // Step simulation many times to let elevators process every stop.
        for (int step = 0; step < 40; step++) {
            controller.stepSimulation();
        }

        for (Elevator e : controller.getElevators()) {
            assertTrue(e.getCurrentOccupancy() <= e.getCapacity(),
                    "Elevator " + e.getName() + " exceeded capacity! Occupancy: " + e.getCurrentOccupancy());
        }
    }

    @Test
    public void concurrentRequests_exactlyOnceEachAndNoLostOrDuplicatedRequests() throws Exception {
        int numThreads = 24;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<Request>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            final int source = (i % 10) + 1;
            int rawDest = source + 3;
            final int destination = rawDest > 10 ? source - 3 : rawDest;

            futures.add(executor.submit(() -> {
                startLatch.await();
                return controller.handleExternalRequest(source, destination);
            }));
        }

        startLatch.countDown();

        List<Request> results = new ArrayList<>();
        for (Future<Request> f : futures) {
            results.add(f.get(5, TimeUnit.SECONDS));
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        // Every request produced a distinct id — nobody's request was silently merged or lost.
        Set<Long> ids = results.stream().map(Request::getId).collect(Collectors.toSet());
        assertEquals(numThreads, ids.size(), "every request must get a unique id");
        assertEquals(numThreads, repository.getAllRequests().size());

        // Every request landed in a real terminal-ish status — never left at the default PENDING.
        // Snapshot which request ids were actually ASSIGNED a car *before* the simulation runs —
        // `results` holds live, mutable Request references straight out of the repository, and
        // stepSimulation mutates their status to COMPLETED in place, so this must be captured
        // before ticking or it silently reads back an already-advanced status.
        Set<Long> assignedIds = new java.util.HashSet<>();
        for (Request r : results) {
            assertTrue(Set.of("ASSIGNED", "QUEUED").contains(r.getStatus()),
                    "request " + r.getId() + " has unexpected status " + r.getStatus());
            if ("ASSIGNED".equals(r.getStatus())) {
                assignedIds.add(r.getId());
            }
        }
        assertFalse(assignedIds.isEmpty(), "at least one of the 24 concurrent requests must have found an eligible car immediately");

        // Run the simulation to completion; every request that WAS assigned a car must eventually
        // complete — proof that no car was handed a stop that then got silently dropped by a race.
        // A generous tick budget: worst case, up to 24 requests spread across 4 cars on a 10-floor
        // building means a car may have to sweep the full corridor more than once before every
        // queued stop is visited (stepSimulation's stop check is bucket-agnostic — it matches a
        // pending floor in either upStops or downStops regardless of which set holds it — so
        // nothing is ever permanently skipped, only potentially revisited).
        for (int step = 0; step < 200; step++) {
            controller.stepSimulation();
        }

        long completedAssignedCount = repository.getAllRequests().stream()
                .filter(r -> assignedIds.contains(r.getId()) && "COMPLETED".equals(r.getStatus()))
                .count();
        assertEquals(assignedIds.size(), completedAssignedCount,
                "every request that was assigned a car must eventually complete, with none dropped mid-flight");
    }

    @Test
    public void concurrentMaintenanceToggles_neverLeaveIllegalStateOrThrow() throws Exception {
        long elevatorId = 1L;
        int numThreads = 16;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger failures = new AtomicInteger(0);
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            final boolean toMaintenance = i % 2 == 0;
            futures.add(executor.submit(() -> {
                try {
                    latch.await();
                    controller.setElevatorMaintenance(elevatorId, toMaintenance);
                } catch (Exception e) {
                    failures.incrementAndGet();
                }
                return null;
            }));
        }

        latch.countDown();
        for (Future<?> f : futures) {
            f.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(0, failures.get(), "no thread should ever observe an illegal-transition exception from the guarded maintenance toggle");

        Elevator elevator = repository.getElevator(elevatorId);
        assertTrue(elevator.getState() == ElevatorState.IDLE || elevator.getState() == ElevatorState.MAINTENANCE,
                "elevator must settle into a legal terminal-ish state, not something ad-hoc");
    }
}

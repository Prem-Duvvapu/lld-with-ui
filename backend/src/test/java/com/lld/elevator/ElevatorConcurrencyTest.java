package com.lld.elevator;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.observer.ElevatorNotifier;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.service.ElevatorControllerService;
import com.lld.elevator.strategy.LookScanDispatchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

public class ElevatorConcurrencyTest {

    private ElevatorRepository repository;
    private ElevatorControllerService controller;

    @BeforeEach
    public void setUp() {
        repository = new ElevatorRepository();
        repository.init();
        LookScanDispatchStrategy strategy = new LookScanDispatchStrategy();
        ElevatorNotifier notifier = new ElevatorNotifier();
        controller = new ElevatorControllerService(repository, strategy, notifier);
    }

    @Test
    public void test10ConcurrentRequestsNoDeadlockOrOverflow() throws Exception {
        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);
        List<Future<Boolean>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            final int floor = (i % 10) + 1;
            final Direction dir = (i % 2 == 0) ? Direction.UP : Direction.DOWN;

            futures.add(executor.submit(() -> {
                latch.await(); // Synchronize all 10 threads to fire simultaneously
                controller.handleExternalRequest(floor, dir);
                return true;
            }));
        }

        // Release all 10 threads concurrently
        latch.countDown();

        for (Future<Boolean> future : futures) {
            assertTrue(future.get(5, TimeUnit.SECONDS));
        }

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        // Step simulation 5 times to let elevators process stops
        for (int step = 0; step < 5; step++) {
            controller.stepSimulation();
        }

        // Verify that no elevator exceeded its capacity limit
        for (Elevator e : controller.getElevators()) {
            assertTrue(e.getCurrentOccupancy() <= e.getCapacity(),
                    "Elevator " + e.getName() + " exceeded capacity! Occupancy: " + e.getCurrentOccupancy());
        }
    }
}

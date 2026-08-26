package com.lld.elevator;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.Request;
import com.lld.elevator.repository.ElevatorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * {@link ElevatorRepository} is more than a bare id/save/get wrapper: it filters pending
 * requests by status and hands out request ids from a shared atomic counter, both real behavior
 * worth testing independently of the service (unlike, say, a pure CRUD repository, which this
 * repo's own convention merges into the service test instead).
 */
public class ElevatorRepositoryTest {

    private ElevatorRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new ElevatorRepository();
        repository.init();
    }

    @Test
    public void initSeedsFourElevators() {
        List<Elevator> all = repository.getAllElevators();
        assertEquals(4, all.size());
        assertEquals(Set.of(1L, 2L, 3L, 4L), all.stream().map(Elevator::getId).collect(Collectors.toSet()));
    }

    @Test
    public void saveElevatorUpsertsById() {
        Elevator e = repository.getElevator(1L);
        e.setCurrentFloor(7);
        repository.saveElevator(e);

        assertEquals(7, repository.getElevator(1L).getCurrentFloor());
        assertEquals(4, repository.getAllElevators().size(), "save must upsert, not append a duplicate");
    }

    @Test
    public void getElevatorHasBothLongAndIntOverloads() {
        assertNotNull(repository.getElevator(1L));
        assertNotNull(repository.getElevator(1));
        assertSame(repository.getElevator(1L), repository.getElevator(1));
        assertNull(repository.getElevator(999L));
    }

    @Test
    public void getPendingRequestsFiltersOutCompletedAndQueued() {
        Request pending = Request.of(1, 5);
        pending.setId(repository.nextRequestId());
        pending.setStatus("PENDING");
        repository.saveRequest(pending);

        Request assigned = Request.of(2, 6);
        assigned.setId(repository.nextRequestId());
        assigned.setStatus("ASSIGNED");
        repository.saveRequest(assigned);

        Request completed = Request.of(3, 7);
        completed.setId(repository.nextRequestId());
        completed.setStatus("COMPLETED");
        repository.saveRequest(completed);

        Request queued = Request.of(4, 8);
        queued.setId(repository.nextRequestId());
        queued.setStatus("QUEUED");
        repository.saveRequest(queued);

        List<Request> pendingOnes = repository.getPendingRequests();
        Set<Long> pendingIds = pendingOnes.stream().map(Request::getId).collect(Collectors.toSet());

        assertTrue(pendingIds.contains(pending.getId()));
        assertTrue(pendingIds.contains(assigned.getId()));
        assertFalse(pendingIds.contains(completed.getId()));
        assertFalse(pendingIds.contains(queued.getId()));
    }

    @Test
    public void nextRequestIdIsMonotonicAndUniqueUnderConcurrency() throws Exception {
        int threads = 20;
        int perThread = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        List<Future<List<Long>>> futures = new java.util.ArrayList<>();

        for (int t = 0; t < threads; t++) {
            futures.add(executor.submit(() -> {
                latch.await();
                List<Long> ids = new java.util.ArrayList<>();
                for (int i = 0; i < perThread; i++) {
                    ids.add(repository.nextRequestId());
                }
                return ids;
            }));
        }

        latch.countDown();
        Set<Long> allIds = ConcurrentHashMap.newKeySet();
        for (Future<List<Long>> f : futures) {
            for (Long id : f.get(5, TimeUnit.SECONDS)) {
                assertTrue(allIds.add(id), "request id " + id + " was handed out more than once");
            }
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(threads * perThread, allIds.size());
    }
}

package com.lld.kvstore;

import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.model.SimEvent;
import com.lld.kvstore.repository.KvStoreRepository;
import com.lld.kvstore.service.KvStoreService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class KvStoreSimulationLifecycleTest {
    private static KvStoreService service(KvStoreRepository sandbox) {
        var service = new KvStoreService(new KvStoreRepository());
        ReflectionTestUtils.setField(ReflectionTestUtils.getField(service, "simulation"), "repository", sandbox);
        return service;
    }

    @SuppressWarnings("unchecked")
    private static List<SimEvent> events(Map<String, Object> snapshot) {
        return (List<SimEvent>) snapshot.get("events");
    }

    @Test
    void returnedEventsAndTheirContainersCannotRewriteStoredHistory() {
        var service = new KvStoreService(new KvStoreRepository());
        var response = service.simSet("key", "value", null);
        int initialSize = events(response).size();
        events(response).get(0).setDescription("caller rewrite");
        assertNotEquals("caller rewrite", service.getSimEvents().get(0).getDescription());
        try { events(response).clear(); } catch (UnsupportedOperationException immutableList) { /* also safe */ }
        assertEquals(initialSize, service.getSimEvents().size());
        service.getSimEvents().get(0).setType("caller type");
        assertEquals("SIM_RESET", service.getSimEvents().get(0).getType());
    }

    @Test
    void aCapturedSnapshotDoesNotGrowOrDisappearAfterLaterOperationsAndReset() {
        var service = new KvStoreService(new KvStoreRepository());
        var old = service.simSet("key", "first", null);
        int oldSize = events(old).size();
        service.simSet("key", "second", null);
        assertEquals(oldSize, events(old).size());
        service.initSimState();
        assertEquals(oldSize, events(old).size());
        assertEquals("SET", events(old).get(oldSize - 1).getType());
    }

    @SuppressWarnings("unchecked")
    @Test
    void raceSummaryAndEventDetailsAreDetachedAndSurviveTheFinalRead() throws Exception {
        var service = new KvStoreService(new KvStoreRepository());
        var response = service.simCasRace(4);
        var summary = (Map<String, Object>) response.get("raceResult");
        var completion = events(response).stream().filter(e -> e.getType().equals("RACE_COMPLETE")).findFirst().orElseThrow();
        summary.put("won", 999);
        completion.getDetails().put("lost", 999);
        var fresh = service.getSimSnapshots();
        var freshSummary = (Map<String, Object>) fresh.get("raceResult");
        assertNotNull(freshSummary, "the final review read retains the actual completed experiment");
        assertEquals(1, freshSummary.get("won"));
        assertEquals(3, freshSummary.get("lost"));
        var freshCompletion = service.getSimEvents().stream().filter(e -> e.getType().equals("RACE_COMPLETE")).findFirst().orElseThrow();
        assertEquals(1, freshCompletion.getDetails().get("won"));
        assertEquals(3, freshCompletion.getDetails().get("lost"));
    }

    enum Observer { RESET, SNAPSHOT, EVENTS, REPLAY, READ, SET, RACE }

    @ParameterizedTest
    @EnumSource(Observer.class)
    void aWholeOperationCommitsItsEventBeforeAnotherOperationCanObserveOrResetIt(Observer observer) throws Exception {
        var sandbox = spy(new KvStoreRepository());
        var service = service(sandbox);
        var changed = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(call -> {
            KvEntry updated = (KvEntry) call.callRealMethod();
            changed.countDown();
            assertTrue(release.await(5, TimeUnit.SECONDS));
            return updated;
        }).when(sandbox).set(eq("held"), anyString(), isNull());
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first = pool.submit(() -> service.simSet("held", "value", null));
            assertTrue(changed.await(3, TimeUnit.SECONDS));
            var attempted = new CountDownLatch(1);
            var other = pool.submit(() -> {
                attempted.countDown();
                return switch (observer) {
                    case RESET -> { service.initSimState(); yield service.getSimSnapshots(); }
                    case SNAPSHOT -> service.getSimSnapshots();
                    case EVENTS -> service.getSimEvents();
                    case REPLAY -> service.simReplayDemo();
                    case READ -> service.simGet("held");
                    case SET -> service.simSet("other", "second", null);
                    case RACE -> service.simCasRace(2);
                };
            });
            assertTrue(attempted.await(3, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> other.get(100, TimeUnit.MILLISECONDS), "a response cannot split mutation and event commit");
            release.countDown();
            first.get(3, TimeUnit.SECONDS);
            other.get(3, TimeUnit.SECONDS);
            var fresh = service.getSimSnapshots();
            if (observer == Observer.RESET) {
                assertEquals(1, events(fresh).size());
                assertEquals("SIM_RESET", events(fresh).get(0).getType());
                assertEquals(0, fresh.get("walSize"));
            } else assertTrue(events(fresh).stream().anyMatch(e -> e.getType().equals("SET") && e.getDescription().contains("held")));
        } finally { release.countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test
    void theOperationGateDoesNotSerializeCasWorkersAndResetWaitsForTheirCompletion() throws Exception {
        var sandbox = spy(new KvStoreRepository());
        var service = service(sandbox);
        var arrived = new CountDownLatch(4);
        var release = new CountDownLatch(1);
        doAnswer(call -> { arrived.countDown(); assertTrue(release.await(5, TimeUnit.SECONDS)); return call.callRealMethod(); })
                .when(sandbox).cas(anyString(), anyLong(), anyString());
        var pool = Executors.newFixedThreadPool(2);
        try {
            var race = pool.submit(() -> service.simCasRace(4));
            assertTrue(arrived.await(3, TimeUnit.SECONDS), "all four real workers must reach CAS concurrently");
            var reset = pool.submit(() -> { service.initSimState(); return service.getSimSnapshots(); });
            assertThrows(TimeoutException.class, () -> reset.get(100, TimeUnit.MILLISECONDS));
            release.countDown();
            @SuppressWarnings("unchecked") var result = (Map<String, Object>) race.get(3, TimeUnit.SECONDS).get("raceResult");
            assertEquals(1, result.get("won")); assertEquals(3, result.get("lost"));
            var clean = reset.get(3, TimeUnit.SECONDS);
            assertEquals(0, clean.get("walSize")); assertEquals(1, events(clean).size());
        } finally { release.countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test
    void interruptedCoordinatorJoinsWorkersBeforeResetCanBegin() throws Exception {
        var sandbox = spy(new KvStoreRepository());
        var service = service(sandbox);
        var entered = new CountDownLatch(2);
        var interrupted = new CountDownLatch(2);
        var drain = new CountDownLatch(1);
        var workers = new CopyOnWriteArrayList<Thread>();
        doAnswer(call -> {
            workers.add(Thread.currentThread()); entered.countDown();
            try { new CountDownLatch(1).await(); }
            catch (InterruptedException cancelled) { interrupted.countDown(); assertTrue(drain.await(5, TimeUnit.SECONDS)); throw cancelled; }
            return null;
        }).when(sandbox).cas(anyString(), anyLong(), anyString());
        var outcome = new AtomicReference<Throwable>();
        var coordinator = new Thread(() -> { try { service.simCasRace(2); } catch (Throwable cause) { outcome.set(cause); } }, "kv-test-coordinator");
        var pool = Executors.newSingleThreadExecutor();
        try {
            coordinator.start(); assertTrue(entered.await(3, TimeUnit.SECONDS));
            coordinator.interrupt();
            assertTrue(interrupted.await(3, TimeUnit.SECONDS), "coordinator interruption must cancel the actual workers");
            var reset = pool.submit(() -> { service.initSimState(); return service.getSimSnapshots(); });
            assertThrows(TimeoutException.class, () -> reset.get(100, TimeUnit.MILLISECONDS));
            assertTrue(coordinator.isAlive(), "keep the gate while interrupted workers drain");
            drain.countDown(); coordinator.join(3000);
            assertFalse(coordinator.isAlive()); assertInstanceOf(InterruptedException.class, outcome.get());
            assertTrue(workers.stream().noneMatch(Thread::isAlive));
            assertEquals(1, events(reset.get(3, TimeUnit.SECONDS)).size());
        } finally { drain.countDown(); workers.forEach(Thread::interrupt); coordinator.interrupt(); coordinator.join(3000); pool.shutdownNow(); }
    }

    @Test
    void workerFailureIsReportedAndNeverTurnedIntoASuccessfulRaceSummary() {
        var sandbox = spy(new KvStoreRepository());
        var service = service(sandbox);
        doThrow(new IllegalStateException("fixture worker failure")).when(sandbox).cas(anyString(), anyLong(), anyString());
        var failure = assertThrows(RuntimeException.class, () -> service.simCasRace(2));
        assertTrue(failure.getMessage().contains("Reset"));
        assertTrue(service.getSimEvents().stream().noneMatch(e -> e.getType().equals("RACE_COMPLETE")));
        assertTrue(service.getSimEvents().stream().anyMatch(e -> e.getType().equals("RUN_FAILED")));
        service.initSimState();
        assertEquals(1, service.getSimEvents().size());
    }

    @Test
    void ttlReadabilityIsReportedByJavaSeparatelyFromRetainedMappings() throws Exception {
        var service = new KvStoreService(new KvStoreRepository());
        var snapshot = service.simTtlExpiryDemo();
        assertEquals(1, snapshot.get("storedEntryCount"));
        assertEquals(0, snapshot.get("readableEntryCount"));
        assertEquals(List.of("ttl-demo-key"), snapshot.get("expiredKeys"));
        assertTrue(events(snapshot).stream().anyMatch(e -> e.getType().equals("TTL_EXPIRED")));
        assertEquals(events(snapshot).size(), snapshot.get("eventCount"));
    }
}

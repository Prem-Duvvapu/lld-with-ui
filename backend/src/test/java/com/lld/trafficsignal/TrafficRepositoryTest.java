package com.lld.trafficsignal;

import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.TrafficLight;
import com.lld.trafficsignal.observer.SignalChangeNotifier;
import com.lld.trafficsignal.repository.TrafficRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Traffic Signal Repository Storage & Lookup")
class TrafficRepositoryTest {

    private TrafficRepository repository;

    @BeforeEach
    void setUp() {
        repository = new TrafficRepository();
    }

    private Intersection intersection(int id) {
        List<TrafficLight> lights = List.of(new TrafficLight(0, "North"), new TrafficLight(1, "South"));
        return new Intersection(id, "Intersection " + id, lights, new SignalChangeNotifier());
    }

    @Test
    @DisplayName("Absent lookup returns null rather than throwing")
    void absentLookupReturnsNull() {
        assertNull(repository.find(12345));
    }

    @Test
    @DisplayName("Empty collection is returned as an empty list, never null")
    void emptyCollectionIsEmptyNotNull() {
        assertNotNull(repository.findAll());
        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    @DisplayName("Intersections round-trip through the store, keyed by id")
    void intersectionsRoundTrip() {
        Intersection i = intersection(1);
        repository.save(i);
        assertSame(i, repository.find(1));
        assertEquals(1, repository.findAll().size());
    }

    @Test
    @DisplayName("Ids are sequential starting from 1")
    void idsAreSequential() {
        assertEquals(1, repository.nextIntersectionId());
        assertEquals(2, repository.nextIntersectionId());
        assertEquals(3, repository.nextIntersectionId());
    }

    @Test
    @DisplayName("clear() wipes every intersection and resets the id counter")
    void clearWipesEverythingAndResetsCounter() {
        repository.save(intersection(repository.nextIntersectionId()));
        repository.clear();

        assertTrue(repository.findAll().isEmpty());
        assertEquals(1, repository.nextIntersectionId(), "counter must reset too");
    }

    @Test
    @DisplayName("Intersection id generation is atomic under contention — no duplicates across many threads")
    void idGenerationIsAtomicUnderContention() throws InterruptedException {
        int threads = 200;
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        Set<Integer> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    ids.add(repository.nextIntersectionId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "id generation did not finish");
        pool.shutdown();

        assertEquals(threads, ids.size(), "the counter lost updates and handed out duplicate ids");
    }

    @Test
    @DisplayName("Concurrent writes across many distinct intersection ids are all visible")
    void concurrentWritesAllLand() throws InterruptedException {
        int count = 300;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(count);

        IntStream.range(0, count).forEach(i -> pool.submit(() -> {
            try {
                startLatch.await();
                repository.save(intersection(i));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        }));

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "writes did not finish");
        pool.shutdown();

        assertEquals(count, repository.findAll().size(), "a non-concurrent map would have lost writes here");
    }
}

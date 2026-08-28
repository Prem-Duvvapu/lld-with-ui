package com.lld.pubsub;

import com.lld.pubsub.model.PrintSubscriber;
import com.lld.pubsub.model.Subscriber;
import com.lld.pubsub.repository.PubSubRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * {@code PubSubRepository} is not a bare id/save/get wrapper: it is keyed by
 * (topicName, subscriberId) rather than subscriber id alone, which is real, independent
 * behavior worth its own coverage — the composite key is what stops the same subscriber id
 * subscribing to two different topics from clobbering each other's entry (the bug the old
 * id-only map had).
 */
public class PubSubRepositoryTest {

    private PubSubRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new PubSubRepository();
    }

    @Test
    public void sameSubscriberId_onTwoDifferentTopics_trackedIndependently() {
        Subscriber onTechNews = new PrintSubscriber("sub-1", "Consumer A");
        Subscriber onSportsAlerts = new PrintSubscriber("sub-1", "Consumer A");

        repository.save("tech-news", onTechNews);
        repository.save("sports-alerts", onSportsAlerts);

        assertSame(onTechNews, repository.find("tech-news", "sub-1"));
        assertSame(onSportsAlerts, repository.find("sports-alerts", "sub-1"));
        assertNotSame(repository.find("tech-news", "sub-1"), repository.find("sports-alerts", "sub-1"));
        assertEquals(2, repository.size());
    }

    @Test
    public void exists_reflectsSaveAndRemove() {
        assertFalse(repository.exists("tech-news", "sub-1"));

        repository.save("tech-news", new PrintSubscriber("sub-1", "Consumer A"));
        assertTrue(repository.exists("tech-news", "sub-1"));

        repository.remove("tech-news", "sub-1");
        assertFalse(repository.exists("tech-news", "sub-1"));
        assertNull(repository.find("tech-news", "sub-1"));
    }

    @Test
    public void removingFromOneTopic_doesNotAffectTheSameSubscriberIdOnAnotherTopic() {
        repository.save("tech-news", new PrintSubscriber("sub-1", "Consumer A"));
        repository.save("sports-alerts", new PrintSubscriber("sub-1", "Consumer A"));

        repository.remove("tech-news", "sub-1");

        assertFalse(repository.exists("tech-news", "sub-1"));
        assertTrue(repository.exists("sports-alerts", "sub-1"));
    }

    @Test
    public void concurrentSavesAcrossManyThreads_loseNoEntries() throws Exception {
        int threads = 20;
        int perThread = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        for (int t = 0; t < threads; t++) {
            final int threadIdx = t;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int i = 0; i < perThread; i++) {
                        String subscriberId = "sub-" + threadIdx + "-" + i;
                        repository.save("topic-" + threadIdx, new PrintSubscriber(subscriberId, subscriberId));
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(threads * perThread, repository.size(), "concurrent saves under a ConcurrentHashMap must not lose entries");
    }
}

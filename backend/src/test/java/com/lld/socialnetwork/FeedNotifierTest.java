package com.lld.socialnetwork;

import com.lld.socialnetwork.observer.FeedEvent;
import com.lld.socialnetwork.observer.FeedNotifier;
import com.lld.socialnetwork.observer.FeedObserver;
import com.lld.socialnetwork.observer.InAppFeedObserver;
import com.lld.socialnetwork.observer.LoggingFeedObserver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Exercises the Observer pattern itself — {@link FeedNotifier} (Subject) fanning a single
 * {@link FeedEvent} out to independent observers — separately from the service-level workflow
 * test. Mirrors cricinfo's {@code BallEventObserverTest} and inventory's Observer coverage.
 */
@DisplayName("FeedNotifier — Subject/Observer fan-out")
class FeedNotifierTest {

    private FeedEvent event(long postId) {
        return FeedEvent.builder()
                .postId(postId)
                .authorId(1)
                .authorName("Alice")
                .contentPreview("hello")
                .friendsNotified(2)
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("publish fans an event out to every subscribed observer exactly once")
    void publish_fansOutToAllSubscribedObservers() {
        InAppFeedObserver inApp = new InAppFeedObserver();
        AtomicInteger customCalls = new AtomicInteger(0);
        FeedObserver spy = e -> customCalls.incrementAndGet();

        FeedNotifier notifier = new FeedNotifier(List.of(inApp, new LoggingFeedObserver(), spy));
        notifier.publish(event(42));

        assertEquals(1, customCalls.get());
        assertEquals(1, inApp.recentEvents().size());
        assertEquals(42, inApp.recentEvents().get(0).getPostId());
    }

    @Test
    @DisplayName("registerObserver/removeObserver control who receives future publishes")
    void registerAndRemoveObserver() {
        FeedNotifier notifier = new FeedNotifier(List.of());
        AtomicInteger calls = new AtomicInteger();
        FeedObserver observer = e -> calls.incrementAndGet();

        notifier.registerObserver(observer);
        assertEquals(1, notifier.observerCount());
        notifier.publish(event(1));
        assertEquals(1, calls.get());

        notifier.removeObserver(observer);
        assertEquals(0, notifier.observerCount());
        notifier.publish(event(2));
        assertEquals(1, calls.get(), "removed observer must not receive further events");
    }

    @Test
    @DisplayName("a misbehaving observer cannot prevent other observers from receiving the event")
    void oneObserverThrowing_doesNotBreakTheRest() {
        InAppFeedObserver inApp = new InAppFeedObserver();
        FeedObserver throwing = e -> { throw new RuntimeException("boom"); };
        FeedNotifier notifier = new FeedNotifier(List.of(throwing, inApp));

        assertDoesNotThrow(() -> notifier.publish(event(7)));
        assertEquals(1, inApp.recentEvents().size(), "the well-behaved observer still received the event");
    }

    @Test
    @DisplayName("InAppFeedObserver is bounded to the last 100 events")
    void inAppObserver_boundedTo100() {
        InAppFeedObserver inApp = new InAppFeedObserver();
        for (int i = 0; i < 150; i++) {
            inApp.onFeedEvent(event(i));
        }
        List<FeedEvent> recent = inApp.recentEvents();
        assertEquals(100, recent.size());
        assertEquals(50, recent.get(0).getPostId(), "oldest entries should have been evicted first");
        assertEquals(149, recent.get(recent.size() - 1).getPostId());
    }

    @Test
    @DisplayName("InAppFeedObserver.clear() empties the log")
    void inAppObserver_clear() {
        InAppFeedObserver inApp = new InAppFeedObserver();
        inApp.onFeedEvent(event(1));
        assertEquals(1, inApp.recentEvents().size());
        inApp.clear();
        assertTrue(inApp.recentEvents().isEmpty());
    }
}

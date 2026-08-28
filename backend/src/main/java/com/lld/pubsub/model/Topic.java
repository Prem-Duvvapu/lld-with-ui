package com.lld.pubsub.model;

import com.lld.pubsub.exception.DuplicateSubscriptionException;
import com.lld.pubsub.exception.SubscriberNotFoundException;
import com.lld.pubsub.worker.SubscriberWorker;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class Topic {

    private final String name;
    private final CopyOnWriteArrayList<SubscriberWorker> workers = new CopyOnWriteArrayList<>();
    private final AtomicLong publishedCount = new AtomicLong(0);

    public Topic(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    /**
     * Registers a brand-new dedicated worker thread for {@code subscriber}. Rejects a
     * subscriber id that is already active on this topic instead of silently replacing it —
     * replacing used to drop the existing worker's in-flight queue and its delivered/rejected
     * counters with zero warning. Callers that want to change capacity/delay must
     * {@code removeSubscriber} first.
     */
    public synchronized void addSubscriber(Subscriber subscriber, int maxQueueCapacity) {
        if (hasSubscriber(subscriber.getId())) {
            throw new DuplicateSubscriptionException(
                    "Subscriber " + subscriber.getId() + " is already subscribed to topic " + name + "; unsubscribe first to change capacity/delay");
        }
        SubscriberWorker worker = new SubscriberWorker(subscriber, maxQueueCapacity);
        workers.add(worker);
    }

    public synchronized void removeSubscriber(String subscriberId) {
        for (SubscriberWorker worker : workers) {
            if (worker.getSubscriber().getId().equals(subscriberId)) {
                worker.stopGracefully();
                workers.remove(worker);
                return;
            }
        }
        throw new SubscriberNotFoundException("Subscriber " + subscriberId + " is not subscribed to topic " + name);
    }

    public boolean hasSubscriber(String subscriberId) {
        for (SubscriberWorker worker : workers) {
            if (worker.getSubscriber().getId().equals(subscriberId)) {
                return true;
            }
        }
        return false;
    }

    private SubscriberWorker findWorker(String subscriberId) {
        for (SubscriberWorker worker : workers) {
            if (worker.getSubscriber().getId().equals(subscriberId)) {
                return worker;
            }
        }
        return null;
    }

    public List<SubscriberWorker> getWorkers() {
        return workers;
    }

    /** Broadcast fan-out: never throws. Returns the ids of subscribers whose queue was full. */
    public List<String> publish(Message message) {
        publishedCount.incrementAndGet();
        List<String> rejectedSubscriberIds = new ArrayList<>();

        for (SubscriberWorker worker : workers) {
            boolean enqueued = worker.enqueue(message);
            if (!enqueued) {
                rejectedSubscriberIds.add(worker.getSubscriber().getId());
            }
        }

        return rejectedSubscriberIds;
    }

    /**
     * Strict point-to-point send to exactly one subscriber on this topic. Throws
     * {@code SubscriberNotFoundException} if the id isn't registered here, and lets
     * {@code SubscriberWorker#enqueueOrThrow} throw {@code QueueFullException} /
     * {@code DispatchFailedException} for the two ways delivery can fail.
     */
    public void publishToOne(String subscriberId, Message message) {
        SubscriberWorker worker = findWorker(subscriberId);
        if (worker == null) {
            throw new SubscriberNotFoundException("Subscriber " + subscriberId + " is not subscribed to topic " + name);
        }
        publishedCount.incrementAndGet();
        worker.enqueueOrThrow(message);
    }

    public long getPublishedCount() {
        return publishedCount.get();
    }
}

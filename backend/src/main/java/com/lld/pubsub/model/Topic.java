package com.lld.pubsub.model;

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

    public synchronized void addSubscriber(Subscriber subscriber, int maxQueueCapacity) {
        // Remove existing if any
        removeSubscriber(subscriber.getId());
        SubscriberWorker worker = new SubscriberWorker(subscriber, maxQueueCapacity);
        workers.add(worker);
    }

    public synchronized void removeSubscriber(String subscriberId) {
        for (SubscriberWorker worker : workers) {
            if (worker.getSubscriber().getId().equals(subscriberId)) {
                worker.stopGracefully();
                workers.remove(worker);
                break;
            }
        }
    }

    public List<SubscriberWorker> getWorkers() {
        return workers;
    }

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

    public long getPublishedCount() {
        return publishedCount.get();
    }
}

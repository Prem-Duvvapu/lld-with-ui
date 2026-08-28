package com.lld.pubsub.worker;

import com.lld.pubsub.exception.DispatchFailedException;
import com.lld.pubsub.exception.QueueFullException;
import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Subscriber;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class SubscriberWorker implements Runnable {

    private final Subscriber subscriber;
    private final BlockingQueue<Message> queue;
    private final int queueCapacity;
    private final AtomicLong deliveredCount = new AtomicLong(0);
    private final AtomicLong rejectedCount = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);
    private volatile boolean running = true;
    private final Thread workerThread;

    public SubscriberWorker(Subscriber subscriber, int queueCapacity) {
        this.subscriber = subscriber;
        this.queueCapacity = queueCapacity;
        this.queue = new ArrayBlockingQueue<>(queueCapacity);
        this.workerThread = new Thread(this, "SubscriberWorker-" + subscriber.getId());
        this.workerThread.setDaemon(true);
        this.workerThread.start();
    }

    public Subscriber getSubscriber() {
        return subscriber;
    }

    /**
     * Broadcast enqueue used by {@code Topic#publish}: never throws. A full queue or a stopped
     * worker both just return {@code false} so one slow/departed subscriber can never fail
     * delivery to the rest of the topic's subscribers.
     */
    public boolean enqueue(Message message) {
        if (!running) return false;
        boolean accepted = queue.offer(message);
        if (!accepted) {
            rejectedCount.incrementAndGet();
        }
        return accepted;
    }

    /**
     * Strict, single-target enqueue used by {@code PubSubService#publishToSubscriber}: throws
     * instead of swallowing the failure, so a direct/point-to-point send can distinguish "queue
     * momentarily full" ({@link QueueFullException}, 409 — retry later) from "worker already
     * stopped" ({@link DispatchFailedException}, 410 — the subscriber is gone for good).
     */
    public void enqueueOrThrow(Message message) {
        if (!running) {
            throw new DispatchFailedException(
                    "Subscriber " + subscriber.getId() + " worker has already stopped; message " + message.getId() + " cannot be dispatched");
        }
        boolean accepted = queue.offer(message);
        if (!accepted) {
            rejectedCount.incrementAndGet();
            throw new QueueFullException(
                    "Subscriber " + subscriber.getId() + " queue is full (capacity=" + queueCapacity + "); message " + message.getId() + " rejected");
        }
    }

    public int getQueueSize() {
        return queue.size();
    }

    public int getQueueCapacity() {
        return queueCapacity;
    }

    public long getDeliveredCount() {
        return deliveredCount.get();
    }

    public long getRejectedCount() {
        return rejectedCount.get();
    }

    public long getErrorCount() {
        return errorCount.get();
    }

    public boolean isRunning() {
        return running;
    }

    public void stopGracefully() {
        this.running = false;
        if (workerThread != null && workerThread.isAlive()) {
            workerThread.interrupt();
        }
    }

    @Override
    public void run() {
        while (running || !queue.isEmpty()) {
            try {
                Message message = queue.poll(200, TimeUnit.MILLISECONDS);
                if (message != null) {
                    try {
                        subscriber.consume(message);
                        deliveredCount.incrementAndGet();
                    } catch (Exception e) {
                        errorCount.incrementAndGet();
                        System.err.println("Error in subscriber " + subscriber.getId() + ": " + e.getMessage());
                    }
                }
            } catch (InterruptedException e) {
                if (!running && queue.isEmpty()) {
                    break;
                }
            }
        }
    }
}

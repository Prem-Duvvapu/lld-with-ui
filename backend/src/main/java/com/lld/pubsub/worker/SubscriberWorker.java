package com.lld.pubsub.worker;

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

    public boolean enqueue(Message message) {
        if (!running) return false;
        boolean accepted = queue.offer(message);
        if (!accepted) {
            rejectedCount.incrementAndGet();
        }
        return accepted;
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

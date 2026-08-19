package com.lld.logging.appender;

import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.LogMessage;

import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

public class AsyncLogDispatcher {
    private final BlockingQueue<LogTask> queue;
    private final int capacity;
    private final Thread workerThread;
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final AtomicLong droppedCount = new AtomicLong(0);

    public record LogTask(LogMessage message, List<LogAppender> appenders, LogFormatter formatter) {}

    public AsyncLogDispatcher(int capacity) {
        this.capacity = capacity;
        this.queue = new ArrayBlockingQueue<>(capacity);
        this.workerThread = new Thread(this::processQueue, "AsyncLogWorker-1");
        this.workerThread.setDaemon(true);
        this.workerThread.start();
    }

    public boolean dispatch(LogMessage message, List<LogAppender> appenders, LogFormatter formatter) {
        LogTask task = new LogTask(message, appenders, formatter);
        boolean offered = queue.offer(task);
        if (!offered) {
            droppedCount.incrementAndGet();
        }
        return offered;
    }

    private void processQueue() {
        while (running.get() || !queue.isEmpty()) {
            try {
                LogTask task = queue.poll(100, TimeUnit.MILLISECONDS);
                if (task != null) {
                    for (LogAppender appender : task.appenders()) {
                        if (appender.isEnabled()) {
                            appender.append(task.message(), task.formatter());
                        }
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    public int getQueueCapacity() {
        return capacity;
    }

    public int getCurrentQueueSize() {
        return queue.size();
    }

    public long getDroppedCount() {
        return droppedCount.get();
    }

    public void clear() {
        queue.clear();
        droppedCount.set(0);
    }

    public void stop() {
        running.set(false);
        workerThread.interrupt();
    }
}

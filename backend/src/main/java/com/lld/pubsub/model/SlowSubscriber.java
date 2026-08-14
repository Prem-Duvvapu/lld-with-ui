package com.lld.pubsub.model;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class SlowSubscriber implements Subscriber {
    private final String id;
    private final String name;
    private final long processDelayMs;
    private final List<Message> receivedMessages = new CopyOnWriteArrayList<>();

    public SlowSubscriber(String id, String name, long processDelayMs) {
        this.id = id;
        this.name = name;
        this.processDelayMs = processDelayMs;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void consume(Message message) throws InterruptedException {
        if (processDelayMs > 0) {
            Thread.sleep(processDelayMs);
        }
        receivedMessages.add(message);
    }

    public List<Message> getReceivedMessages() {
        return receivedMessages;
    }

    public long getProcessDelayMs() {
        return processDelayMs;
    }
}

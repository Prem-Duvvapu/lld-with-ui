package com.lld.pubsub.model;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class LoggingSubscriber implements Subscriber {
    private final String id;
    private final String name;
    private final List<String> logs = new CopyOnWriteArrayList<>();

    public LoggingSubscriber(String id, String name) {
        this.id = id;
        this.name = name;
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
    public void consume(Message message) {
        String logEntry = String.format("[%s] Consumed msg %s from topic %s: %s",
                name, message.getId(), message.getTopicName(), message.getPayload());
        logs.add(logEntry);
    }

    public List<String> getLogs() {
        return logs;
    }
}

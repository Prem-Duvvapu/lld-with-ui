package com.lld.pubsub.model;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class PrintSubscriber implements Subscriber {
    private final String id;
    private final String name;
    private final List<Message> receivedMessages = new CopyOnWriteArrayList<>();

    public PrintSubscriber(String id, String name) {
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
        receivedMessages.add(message);
    }

    public List<Message> getReceivedMessages() {
        return receivedMessages;
    }
}

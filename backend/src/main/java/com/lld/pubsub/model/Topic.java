package com.lld.pubsub.model;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

public class Topic {
    private String name;
    private ConcurrentHashMap<String, Subscriber> subscribers;
    private List<Message> messages;

    public Topic() {
        this.subscribers = new ConcurrentHashMap<>();
        this.messages = new ArrayList<>();
    }

    public Topic(String name) {
        this();
        this.name = name;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public ConcurrentHashMap<String, Subscriber> getSubscribers() { return subscribers; }
    public void setSubscribers(ConcurrentHashMap<String, Subscriber> subscribers) { this.subscribers = subscribers; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}

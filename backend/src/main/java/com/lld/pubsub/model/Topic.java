package com.lld.pubsub.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class Topic {
    private String name;
    private Map<String, Subscriber> subscribers = new ConcurrentHashMap<>();
    private List<Message> messages = new ArrayList<>();

    public Topic(String name) { this.name = name; }

    public String getName() { return name; }
    public Map<String, Subscriber> getSubscribers() { return subscribers; }
    public List<Message> getMessages() { return messages; }
    public void addSubscriber(Subscriber sub) { subscribers.put(sub.getId(), sub); }
    public void addMessage(Message msg) { messages.add(msg); }
}

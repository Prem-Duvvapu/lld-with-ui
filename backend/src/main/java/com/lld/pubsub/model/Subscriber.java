package com.lld.pubsub.model;

import java.util.ArrayList;
import java.util.List;

public class Subscriber {
    private String id;
    private String name;
    private List<Message> messages;

    public Subscriber() {
        this.messages = new ArrayList<>();
    }

    public Subscriber(String id, String name) {
        this();
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}

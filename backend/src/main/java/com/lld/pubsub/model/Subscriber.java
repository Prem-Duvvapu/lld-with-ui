package com.lld.pubsub.model;

import java.util.ArrayList;
import java.util.List;

public class Subscriber {
    private String id;
    private String name;
    private List<Message> inbox = new ArrayList<>();

    public Subscriber(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public List<Message> getInbox() { return inbox; }
    public void receiveMessage(Message msg) { inbox.add(msg); }
}

package com.lld.pubsub.model;

public class Message {
    private long id;
    private String topic;
    private String content;
    private String publisher;
    private long timestamp;

    public Message(long id, String topic, String content, String publisher, long timestamp) {
        this.id = id;
        this.topic = topic;
        this.content = content;
        this.publisher = publisher;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public String getTopic() { return topic; }
    public String getContent() { return content; }
    public String getPublisher() { return publisher; }
    public long getTimestamp() { return timestamp; }
}

package com.lld.pubsub.model;

public class Message {
    private long id;
    private String topic;
    private String content;
    private String publisher;
    private long timestamp;

    public Message() {}

    public Message(long id, String topic, String content, String publisher, long timestamp) {
        this.id = id;
        this.topic = topic;
        this.content = content;
        this.publisher = publisher;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getPublisher() { return publisher; }
    public void setPublisher(String publisher) { this.publisher = publisher; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}

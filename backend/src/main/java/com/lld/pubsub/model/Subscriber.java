package com.lld.pubsub.model;

public interface Subscriber {
    String getId();
    String getName();
    void consume(Message message) throws Exception;
}

package com.lld.pubsub.service;

import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Subscriber;
import com.lld.pubsub.model.Topic;
import com.lld.pubsub.repository.PubSubRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PubSubService {

    private final PubSubRepository repository;
    private final AtomicLong messageIdCounter = new AtomicLong(1);

    public PubSubService(PubSubRepository repository) {
        this.repository = repository;
    }

    public Topic createTopic(String name) {
        if (repository.findTopic(name) != null) {
            throw new IllegalArgumentException("Topic already exists: " + name);
        }
        Topic topic = new Topic(name);
        repository.saveTopic(topic);
        return topic;
    }

    public String subscribe(String topicName, String subscriberId) {
        Topic topic = repository.findTopic(topicName);
        if (topic == null) {
            throw new IllegalArgumentException("Topic not found: " + topicName);
        }
        Subscriber subscriber = repository.findSubscriber(subscriberId);
        if (subscriber == null) {
            throw new IllegalArgumentException("Subscriber not found: " + subscriberId);
        }
        topic.getSubscribers().put(subscriberId, subscriber);
        return subscriberId + " subscribed to " + topicName;
    }

    public Message publish(String topicName, String publisherName, String content) {
        Topic topic = repository.findTopic(topicName);
        if (topic == null) {
            throw new IllegalArgumentException("Topic not found: " + topicName);
        }
        Message message = new Message(
            messageIdCounter.getAndIncrement(),
            topicName,
            content,
            publisherName,
            System.currentTimeMillis()
        );
        topic.getMessages().add(message);
        for (Subscriber sub : topic.getSubscribers().values()) {
            sub.getInbox().add(message);
        }
        return message;
    }

    public List<Message> poll(String subscriberId) {
        Subscriber subscriber = repository.findSubscriber(subscriberId);
        if (subscriber == null) {
            throw new IllegalArgumentException("Subscriber not found: " + subscriberId);
        }
        List<Message> unread = new ArrayList<>(subscriber.getInbox());
        subscriber.getInbox().clear();
        return unread;
    }

    public List<Topic> getTopics() {
        return new ArrayList<>(repository.findAllTopics().values());
    }

    public List<Subscriber> getSubscribers() {
        return new ArrayList<>(repository.findAllSubscribers().values());
    }

    public Subscriber createSubscriber(String id, String name) {
        if (repository.findSubscriber(id) != null) {
            throw new IllegalArgumentException("Subscriber already exists: " + id);
        }
        Subscriber subscriber = new Subscriber(id, name);
        repository.saveSubscriber(subscriber);
        return subscriber;
    }
}

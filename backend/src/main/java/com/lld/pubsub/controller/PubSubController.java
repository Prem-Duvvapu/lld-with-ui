package com.lld.pubsub.controller;

import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Subscriber;
import com.lld.pubsub.model.Topic;
import com.lld.pubsub.service.PubSubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pubsub")
@CrossOrigin(origins = "*")
public class PubSubController {

    private final PubSubService service;

    public PubSubController(PubSubService service) {
        this.service = service;
    }

    @PostMapping("/topic")
    public ResponseEntity<?> createTopic(@RequestBody Map<String, String> body) {
        try {
            Topic topic = service.createTopic(body.get("name"));
            return ResponseEntity.ok(topic);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/subscriber")
    public ResponseEntity<?> createSubscriber(@RequestBody Map<String, String> body) {
        try {
            Subscriber subscriber = service.createSubscriber(body.get("id"), body.get("name"));
            return ResponseEntity.ok(subscriber);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, String> body) {
        try {
            String result = service.subscribe(body.get("topicName"), body.get("subscriberId"));
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/publish")
    public ResponseEntity<?> publish(@RequestBody Map<String, String> body) {
        try {
            Message message = service.publish(body.get("topicName"), body.get("publisherName"), body.get("content"));
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/topics")
    public List<Topic> getTopics() {
        return service.getTopics();
    }

    @GetMapping("/subscribers")
    public List<Subscriber> getSubscribers() {
        return service.getSubscribers();
    }

    @GetMapping("/poll/{subscriberId}")
    public ResponseEntity<?> poll(@PathVariable String subscriberId) {
        try {
            List<Message> messages = service.poll(subscriberId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

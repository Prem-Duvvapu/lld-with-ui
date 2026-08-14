package com.lld.pubsub.controller;

import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.SimEvent;
import com.lld.pubsub.model.Topic;
import com.lld.pubsub.model.TopicSnapshot;
import com.lld.pubsub.service.PubSubService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pubsub")
@CrossOrigin(origins = "*")
public class PubSubController {

    private final PubSubService pubSubService;

    public PubSubController(PubSubService pubSubService) {
        this.pubSubService = pubSubService;
    }

    @PostMapping("/topics")
    public Topic createTopic(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        return pubSubService.createTopic(name);
    }

    @GetMapping("/topics")
    public List<Topic> getTopics() {
        return pubSubService.getTopics();
    }

    @GetMapping("/topics/{name}")
    public Topic getTopic(@PathVariable String name) {
        return pubSubService.getTopic(name);
    }

    @PostMapping("/subscribe")
    public void subscribe(@RequestBody Map<String, Object> body) {
        String topicName = body.get("topicName").toString();
        String subscriberId = body.get("subscriberId").toString();
        String subscriberName = body.getOrDefault("subscriberName", subscriberId).toString();
        String subscriberType = body.getOrDefault("subscriberType", "PRINT").toString();
        int capacity = body.containsKey("capacity") ? Integer.parseInt(body.get("capacity").toString()) : 50;
        Long delayMs = body.containsKey("delayMs") ? Long.parseLong(body.get("delayMs").toString()) : 0L;

        pubSubService.subscribe(topicName, subscriberId, subscriberName, subscriberType, capacity, delayMs);
    }

    @PostMapping("/unsubscribe")
    public void unsubscribe(@RequestBody Map<String, String> body) {
        String topicName = body.get("topicName");
        String subscriberId = body.get("subscriberId");
        pubSubService.unsubscribe(topicName, subscriberId);
    }

    @PostMapping("/publish")
    public List<String> publish(@RequestBody Map<String, String> body) {
        String topicName = body.get("topicName");
        String payload = body.get("payload");
        String publisherId = body.getOrDefault("publisherId", "anonymous");
        return pubSubService.publish(topicName, payload, publisherId);
    }

    @GetMapping("/subscribers/{subscriberId}/messages")
    public List<Message> getSubscriberMessages(@RequestParam String topicName, @PathVariable String subscriberId) {
        return pubSubService.getSubscriberMessages(topicName, subscriberId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public List<TopicSnapshot> simReset() {
        pubSubService.initSimState();
        return pubSubService.getSimSnapshots();
    }

    @PostMapping("/sim/create-topic")
    public List<TopicSnapshot> simCreateTopic(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        return pubSubService.simCreateTopic(name);
    }

    @PostMapping("/sim/subscribe")
    public List<TopicSnapshot> simSubscribe(@RequestBody Map<String, Object> body) {
        String topicName = body.get("topicName").toString();
        String subscriberId = body.get("subscriberId").toString();
        String subscriberName = body.getOrDefault("subscriberName", subscriberId).toString();
        String type = body.getOrDefault("type", "PRINT").toString();
        int capacity = Integer.parseInt(body.getOrDefault("capacity", "10").toString());
        Long delayMs = body.containsKey("delayMs") ? Long.parseLong(body.get("delayMs").toString()) : 0L;

        return pubSubService.simSubscribe(topicName, subscriberId, subscriberName, type, capacity, delayMs);
    }

    @PostMapping("/sim/unsubscribe")
    public List<TopicSnapshot> simUnsubscribe(@RequestBody Map<String, String> body) {
        String topicName = body.get("topicName");
        String subscriberId = body.get("subscriberId");
        return pubSubService.simUnsubscribe(topicName, subscriberId);
    }

    @PostMapping("/sim/publish")
    public List<TopicSnapshot> simPublish(@RequestBody Map<String, String> body) {
        String topicName = body.get("topicName");
        String payload = body.get("payload");
        String publisherId = body.getOrDefault("publisherId", "sim-publisher");
        return pubSubService.simPublish(topicName, payload, publisherId);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return pubSubService.getSimEvents();
    }

    @GetMapping("/sim/snapshots")
    public List<TopicSnapshot> simGetSnapshots() {
        return pubSubService.getSimSnapshots();
    }
}

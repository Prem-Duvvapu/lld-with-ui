package com.lld.pubsub.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class PubSubInitializer implements CommandLineRunner {

    private final PubSubService pubSubService;

    public PubSubInitializer(PubSubService pubSubService) {
        this.pubSubService = pubSubService;
    }

    @Override
    public void run(String... args) {
        // Seed topics
        pubSubService.createTopic("tech-news");
        pubSubService.createTopic("sports-alerts");
        pubSubService.createTopic("finance-feed");

        // Seed subscribers
        pubSubService.subscribe("tech-news", "sub-fast-1", "Fast Tech Consumer", "PRINT", 50, 0L);
        pubSubService.subscribe("tech-news", "sub-slow-1", "Slow Analytics Engine", "SLOW", 5, 250L);
        pubSubService.subscribe("sports-alerts", "sub-logger-1", "Sports Audit Logger", "LOGGING", 50, 0L);

        // Seed initial publish
        pubSubService.publish("tech-news", "Initial Welcome Message: System Online", "system");
    }
}

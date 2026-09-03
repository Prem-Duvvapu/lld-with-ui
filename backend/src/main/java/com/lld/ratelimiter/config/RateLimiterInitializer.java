package com.lld.ratelimiter.config;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitAlgorithm;
import com.lld.ratelimiter.repository.RateLimiterRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Seeds two demo clients on one algorithm each, so the UI shows something meaningful on load. */
@Component
public class RateLimiterInitializer {

    private final RateLimiterRepository repository;

    @Autowired
    public RateLimiterInitializer(RateLimiterRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        long now = System.currentTimeMillis();

        repository.configure("mobile-app", ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.TOKEN_BUCKET)
                .capacityOrLimit(10)
                .refillPerSecondOrWindowSeconds(2.0)
                .build(), now);

        repository.configure("partner-api", ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.SLIDING_WINDOW_COUNTER)
                .capacityOrLimit(5)
                .refillPerSecondOrWindowSeconds(10.0) // 10-second window
                .build(), now);
    }
}

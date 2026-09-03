package com.lld.circuitbreaker.config;

import com.lld.circuitbreaker.service.CircuitBreakerService;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import com.lld.circuitbreaker.strategy.FailureRateTripPolicy;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

/** Seeds three demo breakers at boot, deliberately mixing both {@code TripPolicy} implementations so the UI shows both in real use, not just declared. */
@Component
public class CircuitBreakerInitializer {
    private final CircuitBreakerService service;

    public CircuitBreakerInitializer(CircuitBreakerService service) {
        this.service = service;
    }

    @PostConstruct
    public void seed() {
        service.registerService("payment-service", new ConsecutiveFailureTripPolicy(3), 10_000L, 20);
        service.registerService("inventory-service", new FailureRateTripPolicy(0.5, 4), 8_000L, 10);
        service.registerService("notification-service", new ConsecutiveFailureTripPolicy(5), 5_000L, 20);
    }
}

package com.lld.circuitbreaker;

import com.lld.circuitbreaker.clock.SystemClock;
import com.lld.circuitbreaker.exception.UnknownServiceException;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.repository.CircuitBreakerRegistry;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CircuitBreakerRegistry — one breaker per service name, no silent auto-vivification")
class CircuitBreakerRegistryTest {

    private CircuitBreakerRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new CircuitBreakerRegistry();
    }

    @Test
    @DisplayName("register() stores a breaker retrievable by name")
    void registerStoresRetrievableBreaker() {
        CircuitBreaker breaker = registry.register("svc-a", new ConsecutiveFailureTripPolicy(3), 1_000L, 10, new SystemClock());
        assertSame(breaker, registry.get("svc-a"));
    }

    @Test
    @DisplayName("get() on an unregistered name throws UnknownServiceException, not a silent auto-create")
    void getUnknownServiceThrows() {
        UnknownServiceException ex = assertThrows(UnknownServiceException.class, () -> registry.get("nope"));
        assertTrue(ex.getMessage().contains("nope"));
    }

    @Test
    @DisplayName("findAll() returns every registered breaker")
    void findAllReturnsEveryBreaker() {
        registry.register("svc-a", new ConsecutiveFailureTripPolicy(3), 1_000L, 10, new SystemClock());
        registry.register("svc-b", new ConsecutiveFailureTripPolicy(3), 1_000L, 10, new SystemClock());

        assertEquals(2, registry.findAll().size());
    }

    @Test
    @DisplayName("re-registering a name replaces the previous breaker with fresh state")
    void reregisteringReplacesBreaker() {
        CircuitBreaker first = registry.register("svc-a", new ConsecutiveFailureTripPolicy(1), 1_000L, 10, new SystemClock());
        first.attemptCall(false); // trips it OPEN

        CircuitBreaker fresh = registry.register("svc-a", new ConsecutiveFailureTripPolicy(1), 1_000L, 10, new SystemClock());
        assertNotSame(first, fresh);
        assertEquals(com.lld.circuitbreaker.model.CircuitPhase.CLOSED, registry.get("svc-a").getPhase());
    }

    @Test
    @DisplayName("clear() removes every registered breaker")
    void clearRemovesEverything() {
        registry.register("svc-a", new ConsecutiveFailureTripPolicy(3), 1_000L, 10, new SystemClock());
        registry.clear();
        assertTrue(registry.findAll().isEmpty());
        assertThrows(UnknownServiceException.class, () -> registry.get("svc-a"));
    }
}

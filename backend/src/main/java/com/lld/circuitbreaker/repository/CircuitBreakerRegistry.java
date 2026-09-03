package com.lld.circuitbreaker.repository;

import com.lld.circuitbreaker.clock.Clock;
import com.lld.circuitbreaker.exception.UnknownServiceException;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.strategy.TripPolicy;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * One {@link CircuitBreaker} per named downstream dependency, keyed in a {@link
 * ConcurrentHashMap} — the map only guards registration/lookup; each breaker guards its own state
 * with its own lock (per-entity locking, the same shape as {@code library}'s per-book lock or
 * {@code uber}'s per-driver lock), so calls against two different services never contend.
 *
 * <p>Deliberately does not auto-create a breaker on first call: {@link #get} throws {@link
 * UnknownServiceException} for a name nothing registered — a circuit breaker for a dependency
 * nobody declared is not a real safety net, so silently vivifying one would hide a
 * misconfiguration rather than surface it.
 */
public class CircuitBreakerRegistry {
    private final ConcurrentHashMap<String, CircuitBreaker> breakers = new ConcurrentHashMap<>();

    public CircuitBreaker register(String serviceName, TripPolicy tripPolicy, long cooldownMillis, int windowCapacity, Clock clock) {
        CircuitBreaker breaker = new CircuitBreaker(serviceName, tripPolicy, cooldownMillis, windowCapacity, clock);
        breakers.put(serviceName, breaker);
        return breaker;
    }

    public CircuitBreaker get(String serviceName) {
        CircuitBreaker breaker = breakers.get(serviceName);
        if (breaker == null) {
            throw new UnknownServiceException("No circuit breaker registered for service '" + serviceName + "'.");
        }
        return breaker;
    }

    public List<CircuitBreaker> findAll() {
        return List.copyOf(breakers.values());
    }

    public void clear() {
        breakers.clear();
    }
}

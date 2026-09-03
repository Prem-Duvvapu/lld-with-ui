package com.lld.circuitbreaker.service;

import com.lld.circuitbreaker.clock.Clock;
import com.lld.circuitbreaker.clock.ManualClock;
import com.lld.circuitbreaker.clock.SystemClock;
import com.lld.circuitbreaker.exception.CircuitOpenException;
import com.lld.circuitbreaker.model.CallOutcome;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.SimEvent;
import com.lld.circuitbreaker.repository.CircuitBreakerRegistry;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Facade the controller delegates to wholesale. Owns the live {@link CircuitBreakerRegistry}
 * (real {@link SystemClock}, seeded by {@link com.lld.circuitbreaker.config.CircuitBreakerInitializer})
 * plus a completely separate isolated sandbox registry for the {@code /sim/*} engine, driven by a
 * {@link ManualClock} so a demo can jump straight past a cooldown instead of waiting on real time
 * — matching {@code SplitwiseService}'s {@code repository}/{@code simRepository} split.
 */
@Service
public class CircuitBreakerService {
    public static final String SIM_SERVICE_NAME = "payment-gateway";

    private final CircuitBreakerRegistry registry = new CircuitBreakerRegistry();

    private volatile CircuitBreakerRegistry simRegistry;
    private volatile ManualClock simClock;
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public CircuitBreakerService() {
        simReset();
    }

    // =========================================================================
    // LIVE OPERATIONS
    // =========================================================================

    public CircuitBreaker registerService(String serviceName, com.lld.circuitbreaker.strategy.TripPolicy tripPolicy, long cooldownMillis, int windowCapacity) {
        return registry.register(serviceName, tripPolicy, cooldownMillis, windowCapacity, new SystemClock());
    }

    public List<CircuitBreaker> listServices() {
        return registry.findAll();
    }

    public CircuitBreaker getService(String serviceName) {
        return registry.get(serviceName);
    }

    public CallOutcome call(String serviceName, boolean simulateSuccess) {
        return registry.get(serviceName).attemptCall(simulateSuccess);
    }

    public CircuitBreaker reset(String serviceName) {
        CircuitBreaker existing = registry.get(serviceName);
        return registry.register(serviceName, existing.getTripPolicy(), existing.getCooldownMillis(), 20, new SystemClock());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        simClock = new ManualClock();
        simRegistry = new CircuitBreakerRegistry();
        simRegistry.register(SIM_SERVICE_NAME, new ConsecutiveFailureTripPolicy(3), 5000L, 10, simClock);

        simEvents.add(SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Circuit Breaker Cold Boot")
                .description("'" + SIM_SERVICE_NAME + "' registered CLOSED — trips after 3 consecutive failures, 5s cooldown.")
                .build());
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simCall(boolean simulateSuccess, int step) {
        CircuitBreaker breaker = simRegistry.get(SIM_SERVICE_NAME);
        try {
            CallOutcome outcome = breaker.attemptCall(simulateSuccess);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("CALL_" + (simulateSuccess ? "SUCCEEDED" : "FAILED"))
                    .status(simulateSuccess ? "SUCCESS" : "WARNING")
                    .title(simulateSuccess ? "Call Succeeded" : "Call Failed")
                    .description("Call attempted and " + (simulateSuccess ? "succeeded" : "failed")
                            + ". Breaker is now " + outcome.getPhase() + ".")
                    .build()
                    .addDetail("phase", outcome.getPhase())
                    .addDetail("consecutiveFailures", breaker.getConsecutiveFailures()));
        } catch (CircuitOpenException ex) {
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("CALL_REJECTED").status("ERROR")
                    .title("Call Rejected — Circuit OPEN")
                    .description(ex.getMessage())
                    .build()
                    .addDetail("phase", breaker.getPhase()));
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simAdvanceClock(long millis, int step) {
        simClock.advanceMillis(millis);
        CircuitBreaker breaker = simRegistry.get(SIM_SERVICE_NAME);
        simEvents.add(SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType("CLOCK_ADVANCED").status("INFO")
                .title("Clock Advanced +" + millis + "ms")
                .description("Breaker phase is now " + breaker.getPhase() + ".")
                .build()
                .addDetail("phase", breaker.getPhase())
                .addDetail("remainingCooldownMillis", breaker.getRemainingCooldownMillis()));
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("breaker", simRegistry.get(SIM_SERVICE_NAME));
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }
}

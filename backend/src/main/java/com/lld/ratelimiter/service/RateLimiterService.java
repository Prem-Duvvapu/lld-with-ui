package com.lld.ratelimiter.service;

import com.lld.ratelimiter.exception.ClientNotFoundException;
import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.ClientStatus;
import com.lld.ratelimiter.model.RateLimitDecision;
import com.lld.ratelimiter.model.SimEvent;
import com.lld.ratelimiter.repository.RateLimiterRepository;
import com.lld.ratelimiter.strategy.RateLimiter;
import com.lld.ratelimiter.strategy.RateLimiterFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Facade the controller delegates to wholesale. Owns the production {@link RateLimiterRepository}
 * (one {@link RateLimiter} per registered client, real wall-clock time) plus a completely separate
 * isolated sandbox repository for the {@code /sim/*} engine, driven by a manually-advanced virtual
 * clock instead of {@link System#currentTimeMillis()} so a demo run is fully deterministic and
 * never touches production data — the same isolation shape as
 * {@code TrafficSignalService}'s sim {@code Intersection}.
 */
@Service
public class RateLimiterService {

    private static final String SIM_CLIENT_ID = "sim-client";

    private final RateLimiterRepository repository;
    private final RateLimiterFactory factory;

    private volatile RateLimiterRepository simRepository;
    private volatile long simClockMillis;
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    @Autowired
    public RateLimiterService(RateLimiterRepository repository, RateLimiterFactory factory) {
        this.repository = repository;
        this.factory = factory;
        this.simRepository = new RateLimiterRepository(factory);
        seedSimClient();
    }

    private void seedSimClient() {
        ClientConfig config = ClientConfig.builder()
                .algorithm(com.lld.ratelimiter.model.RateLimitAlgorithm.TOKEN_BUCKET)
                .capacityOrLimit(3)
                .refillPerSecondOrWindowSeconds(1.0)
                .build();
        simRepository.configure(SIM_CLIENT_ID, config, simClockMillis);
    }

    // =========================================================================
    // PRODUCTION OPERATIONS
    // =========================================================================

    public RateLimitDecision attemptRequest(String clientId) {
        RateLimiter limiter = requireClient(clientId);
        RateLimitDecision decision = limiter.tryAcquire(System.currentTimeMillis());
        decision.setClientId(clientId);
        return decision;
    }

    public ClientStatus getStatus(String clientId) {
        RateLimiter limiter = requireClient(clientId);
        return toStatus(clientId, limiter, System.currentTimeMillis());
    }

    public List<ClientStatus> listClients() {
        long now = System.currentTimeMillis();
        return repository.listClientIds().stream()
                .map(id -> toStatus(id, repository.find(id), now))
                .toList();
    }

    public ClientStatus configureClient(String clientId, ClientConfig config) {
        repository.configure(clientId, config, System.currentTimeMillis());
        return getStatus(clientId);
    }

    private RateLimiter requireClient(String clientId) {
        RateLimiter limiter = repository.find(clientId);
        if (limiter == null) {
            throw new ClientNotFoundException("No rate-limit client registered with id " + clientId + ".");
        }
        return limiter;
    }

    /**
     * {@code nowEpochMillis} must be the same clock the caller's own reads/writes on this limiter
     * use — real wall-clock time for a production client, {@link #simClockMillis} for the sim
     * client. Mixing them corrupts the limiter: {@code peek()} would refill based on the huge gap
     * between a virtual clock value and real epoch millis, saturate the bucket, and then stamp
     * {@code lastRefillMillis} with that real timestamp — permanently defeating every future
     * virtual-clock-based refill, since any virtual time will forever compare less than it.
     */
    private ClientStatus toStatus(String clientId, RateLimiter limiter, long nowEpochMillis) {
        RateLimitDecision peek = limiter.peek(nowEpochMillis);
        ClientConfig config = limiter.getConfig();
        return ClientStatus.builder()
                .clientId(clientId)
                .algorithm(config.getAlgorithm())
                .capacityOrLimit(config.getCapacityOrLimit())
                .refillPerSecondOrWindowSeconds(config.getRefillPerSecondOrWindowSeconds())
                .remaining(peek.getRemaining())
                .resetEpochMillis(peek.getResetEpochMillis())
                .totalAllowed(limiter.getTotalAllowed())
                .totalDenied(limiter.getTotalDenied())
                .build();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        simClockMillis = 0L;
        this.simRepository = new RateLimiterRepository(factory);
        seedSimClient();

        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Token Bucket Cold Start")
                .description("sim-client configured with a 3-token bucket refilling at 1 token/second. Bucket starts full.")
                .build()
                .addDetail("capacity", 3)
                .addDetail("refillPerSecond", 1.0);
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simSendRequest(int step) {
        RateLimiter limiter = simRepository.find(SIM_CLIENT_ID);
        RateLimitDecision decision = limiter.tryAcquire(simClockMillis);
        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step)
                .eventType(decision.isAllowed() ? "REQUEST_ALLOWED" : "REQUEST_DENIED")
                .status(decision.isAllowed() ? "SUCCESS" : "WARNING")
                .title(decision.isAllowed() ? "Request Allowed" : "Request Throttled")
                .description(decision.isAllowed()
                        ? "Token consumed. " + decision.getRemaining() + " token(s) remain."
                        : "No tokens available — request rejected (HTTP 429 in a real gateway).")
                .build()
                .addDetail("remaining", decision.getRemaining())
                .addDetail("simClockMillis", simClockMillis);
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simAdvanceClock(long seconds, int step) {
        simClockMillis += seconds * 1000L;
        RateLimiter limiter = simRepository.find(SIM_CLIENT_ID);
        RateLimitDecision peek = limiter.peek(simClockMillis);
        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType("CLOCK_ADVANCED").status("INFO")
                .title("Clock Advanced +" + seconds + "s")
                .description("Bucket refilled. " + peek.getRemaining() + " token(s) now available.")
                .build()
                .addDetail("remaining", peek.getRemaining());
        simEvents.add(event);
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("status", toStatus(SIM_CLIENT_ID, simRepository.find(SIM_CLIENT_ID), simClockMillis));
        snapshot.put("simClockMillis", simClockMillis);
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }
}

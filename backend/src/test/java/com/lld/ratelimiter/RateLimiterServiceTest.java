package com.lld.ratelimiter;

import com.lld.ratelimiter.exception.ClientNotFoundException;
import com.lld.ratelimiter.exception.InvalidRateLimitConfigException;
import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.ClientStatus;
import com.lld.ratelimiter.model.RateLimitAlgorithm;
import com.lld.ratelimiter.model.RateLimitDecision;
import com.lld.ratelimiter.repository.RateLimiterRepository;
import com.lld.ratelimiter.service.RateLimiterService;
import com.lld.ratelimiter.strategy.RateLimiterFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("RateLimiterService — facade behaviour, exceptions, and the isolated /sim/* sandbox")
class RateLimiterServiceTest {

    private RateLimiterService service;
    private RateLimiterRepository repository;

    @BeforeEach
    void setUp() {
        RateLimiterFactory factory = new RateLimiterFactory();
        repository = new RateLimiterRepository(factory);
        service = new RateLimiterService(repository, factory);
    }

    private ClientConfig tokenBucketConfig(int capacity, double refillPerSecond) {
        return ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.TOKEN_BUCKET)
                .capacityOrLimit(capacity)
                .refillPerSecondOrWindowSeconds(refillPerSecond)
                .build();
    }

    @Test
    @DisplayName("attemptRequest on an unknown client throws ClientNotFoundException")
    void attemptRequestUnknownClientThrows() {
        assertThrows(ClientNotFoundException.class, () -> service.attemptRequest("ghost"));
    }

    @Test
    @DisplayName("getStatus on an unknown client throws ClientNotFoundException")
    void getStatusUnknownClientThrows() {
        assertThrows(ClientNotFoundException.class, () -> service.getStatus("ghost"));
    }

    @Test
    @DisplayName("configureClient registers a client, and attemptRequest then succeeds")
    void configureThenAttemptSucceeds() {
        service.configureClient("acme", tokenBucketConfig(2, 1.0));
        RateLimitDecision decision = service.attemptRequest("acme");
        assertTrue(decision.isAllowed());
        assertEquals("acme", decision.getClientId());
    }

    @Test
    @DisplayName("configureClient with an invalid config throws InvalidRateLimitConfigException")
    void configureWithInvalidConfigThrows() {
        ClientConfig bad = tokenBucketConfig(0, 1.0); // capacity must be positive
        assertThrows(InvalidRateLimitConfigException.class, () -> service.configureClient("acme", bad));
    }

    @Test
    @DisplayName("getStatus reports the real remaining count and running allow/deny totals")
    void getStatusReportsRealCounters() {
        service.configureClient("acme", tokenBucketConfig(2, 1.0));
        service.attemptRequest("acme");
        service.attemptRequest("acme");
        service.attemptRequest("acme"); // denied — bucket empty

        ClientStatus status = service.getStatus("acme");
        assertEquals(0, status.getRemaining());
        assertEquals(2, status.getTotalAllowed());
        assertEquals(1, status.getTotalDenied());
    }

    @Test
    @DisplayName("listClients reflects every configured client")
    void listClientsReflectsAllConfigured() {
        service.configureClient("acme", tokenBucketConfig(2, 1.0));
        service.configureClient("beta", tokenBucketConfig(3, 1.0));
        List<ClientStatus> statuses = service.listClients();
        assertEquals(2, statuses.size());
    }

    @Test
    @DisplayName("The isolated /sim/* sandbox is seeded independently and never touches production clients")
    void simSandboxIsIsolatedFromProduction() {
        service.configureClient("acme", tokenBucketConfig(2, 1.0));

        Map<String, Object> snapshot = service.simReset();
        assertNotNull(snapshot.get("status"));

        // Draining the sim client must not affect the real "acme" client's counters.
        service.simSendRequest(2);
        service.simSendRequest(3);
        service.simSendRequest(4); // sim bucket (capacity 3) now exhausted

        ClientStatus acmeStatus = service.getStatus("acme");
        assertEquals(0, acmeStatus.getTotalAllowed(), "the sim run must not have touched the real client");
    }

    @Test
    @DisplayName("simAdvanceClock lets the sim bucket refill, observable in the next sim snapshot")
    void simAdvanceClockRefillsSimBucket() {
        service.simReset();
        service.simSendRequest(2);
        service.simSendRequest(3);
        service.simSendRequest(4); // sim bucket (capacity 3, refill 1/s) now empty

        Map<String, Object> afterAdvance = service.simAdvanceClock(2, 5);
        ClientStatus simStatus = (ClientStatus) afterAdvance.get("status");
        assertTrue(simStatus.getRemaining() >= 1, "2 simulated seconds at 1 token/sec must refill at least one token");
    }
}

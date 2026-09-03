package com.lld.ratelimiter;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitAlgorithm;
import com.lld.ratelimiter.repository.RateLimiterRepository;
import com.lld.ratelimiter.strategy.RateLimiter;
import com.lld.ratelimiter.strategy.RateLimiterFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("RateLimiterRepository — per-client storage and atomic first-touch creation")
class RateLimiterRepositoryTest {

    private RateLimiterRepository repository;

    private ClientConfig defaultConfig() {
        return ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.TOKEN_BUCKET)
                .capacityOrLimit(5)
                .refillPerSecondOrWindowSeconds(1.0)
                .build();
    }

    @BeforeEach
    void setUp() {
        repository = new RateLimiterRepository(new RateLimiterFactory());
    }

    @Test
    @DisplayName("find on an unregistered client returns null")
    void findUnregisteredClientReturnsNull() {
        assertNull(repository.find("nope"));
    }

    @Test
    @DisplayName("findOrCreate creates once and returns the same instance on repeated calls")
    void findOrCreateIsIdempotent() {
        RateLimiter first = repository.findOrCreate("client-1", defaultConfig(), 0L);
        RateLimiter second = repository.findOrCreate("client-1", defaultConfig(), 0L);
        assertSame(first, second, "a second findOrCreate for the same client must not replace its state");
    }

    @Test
    @DisplayName("configure replaces an existing client's limiter with a freshly-configured one")
    void configureReplacesExistingLimiter() {
        RateLimiter original = repository.findOrCreate("client-1", defaultConfig(), 0L);
        original.tryAcquire(0L); // consume a token so state differs from fresh

        repository.configure("client-1", defaultConfig(), 0L);
        RateLimiter replaced = repository.find("client-1");

        assertNotSame(original, replaced);
        assertEquals(5, replaced.peek(0L).getRemaining(), "the replaced limiter must start fresh, not inherit consumed state");
    }

    @Test
    @DisplayName("listClientIds reflects every registered client, and only those")
    void listClientIdsReflectsRegisteredClients() {
        repository.findOrCreate("client-1", defaultConfig(), 0L);
        repository.findOrCreate("client-2", defaultConfig(), 0L);

        List<String> ids = repository.listClientIds();
        assertEquals(2, ids.size());
        assertTrue(ids.contains("client-1"));
        assertTrue(ids.contains("client-2"));
    }

    @Test
    @DisplayName("clear removes every registered client")
    void clearRemovesEveryClient() {
        repository.findOrCreate("client-1", defaultConfig(), 0L);
        repository.clear();
        assertTrue(repository.listClientIds().isEmpty());
    }
}

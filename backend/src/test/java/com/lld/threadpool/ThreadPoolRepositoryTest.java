package com.lld.threadpool;

import com.lld.threadpool.model.CustomThreadPool;
import com.lld.threadpool.repository.ThreadPoolRepository;
import com.lld.threadpool.strategy.AbortPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ThreadPoolRepositoryTest {

    private ThreadPoolRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ThreadPoolRepository();
    }

    @Test
    @DisplayName("a registered pool is found by id")
    void registerThenFind() {
        CustomThreadPool pool = new CustomThreadPool("pool-a", 1, 2, 1, 1000, AbortPolicy.INSTANCE);
        repository.register(pool);
        assertSame(pool, repository.find("pool-a"));
    }

    @Test
    @DisplayName("an unknown id returns null, not an exception — not-found handling belongs to the service")
    void unknownIdReturnsNull() {
        assertNull(repository.find("no-such-pool"));
    }

    @Test
    @DisplayName("listPoolIds reflects every registered pool")
    void listPoolIdsReflectsRegistrations() {
        repository.register(new CustomThreadPool("pool-a", 1, 2, 1, 1000, AbortPolicy.INSTANCE));
        repository.register(new CustomThreadPool("pool-b", 1, 2, 1, 1000, AbortPolicy.INSTANCE));
        assertEquals(2, repository.listPoolIds().size());
        assertTrue(repository.listPoolIds().containsAll(java.util.List.of("pool-a", "pool-b")));
    }
}

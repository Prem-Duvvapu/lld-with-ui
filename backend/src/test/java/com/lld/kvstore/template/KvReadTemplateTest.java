package com.lld.kvstore.template;

import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.model.KvEntry;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/** Proves GetOperation and PeekOperation genuinely diverge on a miss, sharing identical live-entry logic. */
public class KvReadTemplateTest {

    @Test
    void getOperationThrowsOnAMissingKey() {
        Map<String, KvEntry> state = new HashMap<>();
        assertThrows(KeyNotFoundException.class, () -> new GetOperation().read(state, "missing"));
    }

    @Test
    void getOperationThrowsOnAnExpiredKey() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("1").version(1).expiresAtEpoch(1L).build());
        assertThrows(KeyNotFoundException.class, () -> new GetOperation().read(state, "a"));
    }

    @Test
    void getOperationReturnsALiveEntry() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("1").version(1).build());
        assertEquals("1", new GetOperation().read(state, "a").getValue());
    }

    @Test
    void peekOperationReturnsEmptyOnAMissRatherThanThrowing() {
        Map<String, KvEntry> state = new HashMap<>();
        assertEquals(Optional.empty(), new PeekOperation().read(state, "missing"));
    }

    @Test
    void peekOperationReturnsEmptyOnAnExpiredKey() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("1").version(1).expiresAtEpoch(1L).build());
        assertEquals(Optional.empty(), new PeekOperation().read(state, "a"));
    }

    @Test
    void peekOperationReturnsTheEntryWhenLive() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("1").version(1).build());
        assertEquals("1", new PeekOperation().read(state, "a").map(KvEntry::getValue).orElse(null));
    }

    @Test
    void neitherOperationEverMutatesStateEvenOnAnExpiredKey() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("1").version(1).expiresAtEpoch(1L).build());

        try {
            new GetOperation().read(state, "a");
        } catch (KeyNotFoundException ignored) {
            // expected
        }
        new PeekOperation().read(state, "a");

        assertTrue(state.containsKey("a"), "reads must be pure queries -- eviction of a stale entry is a write-path concern, not a read-path one");
    }
}

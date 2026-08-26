package com.lld.concurrency.concurrenthashmap;

import com.lld.concurrency.concurrenthashmap.model.StripedHashMap;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Single-threaded correctness of {@link StripedHashMap}: basic put/get/remove
 * behavior, merge() accumulation, and computeIfAbsent()'s "call the function at
 * most once, only when absent" contract. Real-thread contention is covered
 * separately by {@code StripedHashMapConcurrencyTest}.
 */
class StripedHashMapTest {

    @Test
    void constructorRejectsNonPositiveSegmentCount() {
        assertThrows(IllegalArgumentException.class, () -> new StripedHashMap<String, String>(0));
        assertThrows(IllegalArgumentException.class, () -> new StripedHashMap<String, String>(-4));
    }

    @Test
    void putThenGetReturnsStoredValue() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        map.put("a", "1");
        assertEquals("1", map.get("a"));
    }

    @Test
    void getOnMissingKeyReturnsNull() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        assertNull(map.get("missing"));
    }

    @Test
    void putOverwritesExistingValue() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        map.put("a", "1");
        map.put("a", "2");
        assertEquals("2", map.get("a"));
        assertEquals(1, map.size());
    }

    @Test
    void removeDeletesAndReturnsPriorValue() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        map.put("a", "1");
        assertEquals("1", map.remove("a"));
        assertNull(map.get("a"));
    }

    @Test
    void removeOnMissingKeyReturnsNull() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        assertNull(map.remove("missing"));
    }

    @Test
    void mergeAccumulatesCorrectlyAcrossSequentialCalls() {
        StripedHashMap<String, Long> map = new StripedHashMap<>(4);
        map.merge("counter", 1L, Long::sum);
        map.merge("counter", 1L, Long::sum);
        map.merge("counter", 1L, Long::sum);
        assertEquals(3L, map.get("counter"));
    }

    @Test
    void mergeOnAbsentKeyStoresValueDirectly() {
        StripedHashMap<String, Long> map = new StripedHashMap<>(4);
        Long result = map.merge("counter", 5L, Long::sum);
        assertEquals(5L, result);
        assertEquals(5L, map.get("counter"));
    }

    @Test
    void mergeRemovingViaNullResultDeletesTheKey() {
        StripedHashMap<String, Long> map = new StripedHashMap<>(4);
        map.put("a", 1L);
        Long result = map.merge("a", 1L, (existing, val) -> null);
        assertNull(result);
        assertNull(map.get("a"));
    }

    @Test
    void computeIfAbsentCallsFunctionExactlyOnceWhenKeyIsAbsent() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        AtomicInteger callCount = new AtomicInteger(0);

        String result = map.computeIfAbsent("k", key -> {
            callCount.incrementAndGet();
            return "computed";
        });

        assertEquals("computed", result);
        assertEquals(1, callCount.get());
        assertEquals("computed", map.get("k"));
    }

    @Test
    void computeIfAbsentDoesNotCallFunctionWhenKeyAlreadyPresent() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        map.put("k", "existing");
        AtomicInteger callCount = new AtomicInteger(0);

        String result = map.computeIfAbsent("k", key -> {
            callCount.incrementAndGet();
            return "should-not-be-used";
        });

        assertEquals("existing", result);
        assertEquals(0, callCount.get());
    }

    @Test
    void sizeIsCorrectAfterMixedOperations() {
        StripedHashMap<String, String> map = new StripedHashMap<>(4);
        assertEquals(0, map.size());

        map.put("a", "1");
        map.put("b", "2");
        map.put("c", "3");
        assertEquals(3, map.size());

        map.remove("b");
        assertEquals(2, map.size());

        map.put("a", "overwritten");
        assertEquals(2, map.size());

        map.computeIfAbsent("d", k -> "4");
        assertEquals(3, map.size());
    }
}

package com.lld.concurrency.bloomfilter;

import com.lld.concurrency.bloomfilter.model.BloomFilter;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Core correctness of {@link BloomFilter} in isolation, single-threaded: the
 * central probabilistic guarantee (never a false negative for something actually
 * added) holds across a range of bitSize/hashCount combinations, an empty filter
 * never claims to contain anything, and the constructor rejects nonsense sizes.
 */
class BloomFilterTest {

    @Test
    void constructorRejectsNonPositiveBitSize() {
        assertThrows(IllegalArgumentException.class, () -> new BloomFilter(0, 3));
        assertThrows(IllegalArgumentException.class, () -> new BloomFilter(-10, 3));
    }

    @Test
    void constructorRejectsNonPositiveHashCount() {
        assertThrows(IllegalArgumentException.class, () -> new BloomFilter(64, 0));
        assertThrows(IllegalArgumentException.class, () -> new BloomFilter(64, -2));
    }

    @Test
    void neverProducesAFalseNegativeAcrossManyBitSizeHashCountCombinations() {
        int[] bitSizes = {8, 16, 24, 32, 64, 128};
        int[] hashCounts = {1, 2, 3, 4};

        for (int bitSize : bitSizes) {
            for (int hashCount : hashCounts) {
                BloomFilter filter = new BloomFilter(bitSize, hashCount);
                List<String> added = new ArrayList<>();
                for (int i = 0; i < 50; i++) {
                    String item = "item-" + bitSize + "-" + hashCount + "-" + i;
                    filter.add(item);
                    added.add(item);
                }
                for (String item : added) {
                    assertTrue(filter.mightContain(item),
                            "false negative for " + item + " at bitSize=" + bitSize + " hashCount=" + hashCount);
                }
            }
        }
    }

    @Test
    void queryOnEmptyFilterIsAlwaysFalse() {
        BloomFilter filter = new BloomFilter(64, 4);
        assertFalse(filter.mightContain("never-added"));
        assertFalse(filter.mightContain(""));
        assertFalse(filter.mightContain("anything-else-entirely"));
        assertEquals(0, filter.cardinalityEstimate());
    }

    @Test
    void cardinalityEstimateNeverExceedsBitSizeAndNeverDecreases() {
        BloomFilter filter = new BloomFilter(32, 2);
        assertEquals(0, filter.cardinalityEstimate());
        int prev = 0;
        for (int i = 0; i < 20; i++) {
            filter.add("distinct-" + i);
            int now = filter.cardinalityEstimate();
            assertTrue(now >= prev, "cardinality must never decrease");
            assertTrue(now <= 32, "cardinality must never exceed bitSize");
            prev = now;
        }
    }

    @Test
    void reAddingTheSameItemDoesNotChangeCardinality() {
        BloomFilter filter = new BloomFilter(64, 3);
        filter.add("repeat-me");
        int afterFirst = filter.cardinalityEstimate();
        filter.add("repeat-me");
        int afterSecond = filter.cardinalityEstimate();
        assertEquals(afterFirst, afterSecond, "re-adding the same item must not change the bit count");
        assertTrue(filter.mightContain("repeat-me"));
    }

    @Test
    void hashFunctionsAreIndependentEnoughToRoundTripCorrectlyAtASingleHash() {
        // hashCount == 1 means the position is entirely h1-derived; this still must
        // round-trip correctly, proving h1 alone is deterministic and consistent
        // between add() and mightContain().
        BloomFilter filter = new BloomFilter(50, 1);
        List<String> items = List.of("alpha", "beta", "gamma", "delta", "epsilon");
        items.forEach(filter::add);
        items.forEach(item -> assertTrue(filter.mightContain(item)));
    }
}

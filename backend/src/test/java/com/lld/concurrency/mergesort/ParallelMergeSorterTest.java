package com.lld.concurrency.mergesort;

import com.lld.concurrency.mergesort.model.ParallelMergeSorter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

/**
 * Correctness of {@link ParallelMergeSorter} against a reference sort. The sorter's
 * documented contract is that {@link ParallelMergeSorter#sort(int[])} clones its
 * input internally, so the caller's original array must be left untouched — every
 * test below asserts that alongside the sorted result.
 */
class ParallelMergeSorterTest {

    private final ParallelMergeSorter sorter = new ParallelMergeSorter(4, 4);

    private static int[] reference(int[] array) {
        int[] copy = array.clone();
        java.util.Arrays.sort(copy);
        return copy;
    }

    private void assertSortsCorrectlyWithoutMutatingInput(int[] input) {
        int[] original = input.clone();
        int[] expected = reference(input);

        int[] actual = sorter.sort(input);

        assertArrayEquals(expected, actual, "sorted output must match a reference sort");
        assertArrayEquals(original, input, "sort() must not mutate the array passed in");
    }

    @Test
    void sortsEmptyArray() {
        assertSortsCorrectlyWithoutMutatingInput(new int[0]);
    }

    @Test
    void sortsSingleElementArray() {
        assertSortsCorrectlyWithoutMutatingInput(new int[] {42});
    }

    @Test
    void sortsAlreadySortedArray() {
        assertSortsCorrectlyWithoutMutatingInput(new int[] {1, 2, 3, 4, 5, 6, 7, 8, 9, 10});
    }

    @Test
    void sortsReverseSortedArray() {
        assertSortsCorrectlyWithoutMutatingInput(new int[] {10, 9, 8, 7, 6, 5, 4, 3, 2, 1});
    }

    @Test
    void sortsAllDuplicates() {
        assertSortsCorrectlyWithoutMutatingInput(new int[] {7, 7, 7, 7, 7, 7, 7, 7});
    }

    @Test
    void sortsNegativeNumbers() {
        assertSortsCorrectlyWithoutMutatingInput(new int[] {-5, 3, -100, 0, 42, -1, 17, -8});
    }

    @Test
    void sortsDecentSizeRandomArray() {
        Random random = new Random(12345);
        int[] input = random.ints(500, -1000, 1000).toArray();
        assertSortsCorrectlyWithoutMutatingInput(input);
    }

    @Test
    @Timeout(60)
    void sortsManyRandomArraysOfVaryingSizeAndSeed() {
        for (int iteration = 0; iteration < 30; iteration++) {
            Random random = new Random(iteration * 97L + 3);
            int size = random.nextInt(300);
            int[] input = random.ints(size, -10_000, 10_000).toArray();
            assertSortsCorrectlyWithoutMutatingInput(input);
        }
    }

    @Test
    void sortIsCorrectWithVaryingParallelismAndThreshold() {
        Random random = new Random(999);
        int[] input = random.ints(200, 0, 500).toArray();

        for (int parallelism : new int[] {1, 2, 3, 8}) {
            for (int threshold : new int[] {1, 2, 5, 50, 1000}) {
                ParallelMergeSorter s = new ParallelMergeSorter(parallelism, threshold);
                int[] expected = reference(input);
                int[] actual = s.sort(input);
                assertArrayEquals(expected, actual,
                        "mismatch for parallelism=" + parallelism + " threshold=" + threshold);
            }
        }
    }
}

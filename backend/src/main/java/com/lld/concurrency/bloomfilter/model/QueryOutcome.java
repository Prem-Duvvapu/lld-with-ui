package com.lld.concurrency.bloomfilter.model;

/**
 * The result of one {@code mightContain(item)} call made after the concurrent add
 * phase finished, alongside whether {@code item} was actually part of the batch that
 * was added. {@code falsePositive} is derived, not asserted: it is {@code true} only
 * when the filter says "might contain" for an item that was genuinely never added —
 * the central probabilistic story this module exists to demonstrate.
 */
public record QueryOutcome(
        String item,
        boolean wasAdded,
        boolean mightContain,
        boolean falsePositive
) {
}

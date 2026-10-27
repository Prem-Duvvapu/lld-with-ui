package com.lld.learning.examples.dependency;

/** For a nonnegative subtotal, return a nonnegative fee, both in cents.
 * Implementations reject negative subtotals with IllegalArgumentException.
 */
public interface FeePolicy {
    int feeCents(int subtotalCents);
}

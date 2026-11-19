package com.lld.learning.examples.solid;

/**
 * Accept every whole-gram weight 1..2000. Return cents in 0..2000.
 * Reject every other int with IllegalArgumentException("weightGrams must be 1..2000").
 * Quotes have no externally visible mutation; implementations may charge different fees.
 */
public interface FeePolicy {
    int feeCents(int weightGrams);
}

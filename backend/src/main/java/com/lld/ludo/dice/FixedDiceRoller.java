package com.lld.ludo.dice;

/**
 * Deterministic dice for tests: replays a fixed sequence of rolls, repeating the last value once
 * the sequence is exhausted (rather than throwing) so a test does not have to over-provision
 * rolls it does not care about the exact value of.
 */
public class FixedDiceRoller implements DiceRoller {
    private final int[] sequence;
    private int index;

    public FixedDiceRoller(int... sequence) {
        if (sequence == null || sequence.length == 0) {
            throw new IllegalArgumentException("FixedDiceRoller needs at least one roll");
        }
        for (int value : sequence) {
            if (value < 1 || value > 6) {
                throw new IllegalArgumentException("Die roll must be in [1,6], got: " + value);
            }
        }
        this.sequence = sequence;
    }

    @Override
    public synchronized int roll() {
        int value = sequence[Math.min(index, sequence.length - 1)];
        if (index < sequence.length - 1) index++;
        return value;
    }
}

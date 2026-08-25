package com.lld.snakeladders.dice;

/**
 * Strategy for producing one die roll (1-6). Injected into {@link com.lld.snakeladders.model.Game}
 * so production games roll genuine randomness ({@link RandomDiceRoller}) while tests can pin the
 * exact sequence of rolls with {@link FixedDiceRoller} — the module previously called a static
 * {@code Random} directly from the model, which made deterministic testing of exact-landing,
 * snake-bite and ladder-climb resolution impossible.
 */
public interface DiceRoller {
    /** @return a value in [1, 6]. */
    int roll();
}

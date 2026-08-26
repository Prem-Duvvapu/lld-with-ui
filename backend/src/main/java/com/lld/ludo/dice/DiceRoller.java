package com.lld.ludo.dice;

/**
 * Strategy for producing one die roll (1-6). Injected into {@code LudoService} so production
 * games roll genuine randomness ({@link RandomDiceRoller}) while tests can pin the exact sequence
 * of rolls with {@link FixedDiceRoller} — the same idiom as {@code snakeladders.dice.DiceRoller}
 * and {@code minesweeper.strategy.MinePlacer}. The service previously called a bare, unseeded
 * {@code java.util.Random} directly, which made deterministic testing of "roll a 6 to leave
 * home" / exact-count home entry impossible.
 */
public interface DiceRoller {
    /** @return a value in [1, 6]. */
    int roll();
}

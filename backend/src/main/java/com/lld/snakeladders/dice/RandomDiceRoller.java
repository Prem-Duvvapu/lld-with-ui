package com.lld.snakeladders.dice;

import org.springframework.stereotype.Component;

import java.util.Random;

/** Production dice: a genuine 1-6 uniform roll. {@link Random} is thread-safe, so one instance is shared. */
@Component
public class RandomDiceRoller implements DiceRoller {
    private final Random random;

    public RandomDiceRoller() {
        this(new Random());
    }

    public RandomDiceRoller(Random random) {
        this.random = random;
    }

    @Override
    public int roll() {
        return random.nextInt(6) + 1;
    }
}

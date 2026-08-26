package com.lld.ludo.dice;

import org.springframework.stereotype.Component;

import java.util.Random;

/**
 * Production dice: a genuine 1-6 uniform roll. {@link Random} is thread-safe, so one instance is
 * shared. Named explicitly because {@code snakeladders.dice.RandomDiceRoller} is a distinct class
 * with the same simple name — Spring's default bean-name-from-class-name would otherwise collide
 * ("Annotation-specified bean name 'randomDiceRoller' ... conflicts with existing ... bean
 * definition") and fail the whole application context at startup.
 */
@Component("ludoRandomDiceRoller")
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

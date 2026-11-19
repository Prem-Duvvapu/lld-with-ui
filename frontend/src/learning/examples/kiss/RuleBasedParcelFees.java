package com.lld.learning.examples.kiss;

import java.util.List;
import java.util.function.IntPredicate;
import java.util.function.IntUnaryOperator;

/** Deliberately indirect for this fixed two-band requirement. */
public final class RuleBasedParcelFees {
    private final List<Rule> rules = List.of(
            new Rule(grams -> grams <= 1000, grams -> 300),
            new Rule(grams -> grams <= 2000, grams -> 500));

    public int feeCents(int weightGrams) {
        if (weightGrams < 1 || weightGrams > 2000) {
            throw new IllegalArgumentException("weightGrams must be 1..2000");
        }
        for (Rule rule : rules) {
            if (rule.matches(weightGrams)) {
                return rule.evaluate(weightGrams);
            }
        }
        throw new IllegalStateException("No fee rule matched a supported weight");
    }

    private static final class Rule {
        private final IntPredicate condition;
        private final IntUnaryOperator calculation;

        private Rule(IntPredicate condition, IntUnaryOperator calculation) {
            this.condition = condition;
            this.calculation = calculation;
        }

        private boolean matches(int weightGrams) {
            return condition.test(weightGrams);
        }

        private int evaluate(int weightGrams) {
            return calculation.applyAsInt(weightGrams);
        }
    }
}

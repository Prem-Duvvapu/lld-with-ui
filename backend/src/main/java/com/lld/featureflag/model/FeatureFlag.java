package com.lld.featureflag.model;

import com.lld.featureflag.condition.Condition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A flag's whole targeting logic is one composite {@link Condition} tree hanging off a single
 * field. {@code enabled} is a global kill switch: when {@code false}, evaluation always returns
 * {@code false} regardless of the rule tree.
 *
 * <p><b>The concurrency guarantee this class exists to provide:</b> {@code rule} is
 * {@code volatile}, and {@code FeatureFlagService.updateRules} always builds an entirely new tree
 * and reassigns this one field — it never mutates an existing node's children. A single volatile
 * write is atomic and, combined with never mutating a tree once built, means a concurrent reader
 * calling {@code evaluate()} always sees either the fully-old or the fully-new tree, never a torn
 * mix of the two and never a {@code ConcurrentModificationException} — regardless of how many
 * times {@code updateRules} races against it. See {@code FeatureFlagConcurrencyTest}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeatureFlag {
    private Long id;
    private String key;
    private String description;
    private volatile boolean enabled;
    private volatile Condition rule;

    /** Derived, explanatory view of the current rule tree — never a black box. */
    public String getRuleDescription() {
        Condition current = this.rule;
        return current == null ? "no targeting rule configured" : current.describe();
    }
}

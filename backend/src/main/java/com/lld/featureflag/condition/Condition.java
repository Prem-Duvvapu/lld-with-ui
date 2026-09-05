package com.lld.featureflag.condition;

import com.lld.featureflag.model.UserContext;

/**
 * The Composite pattern's component. A {@link com.lld.featureflag.model.FeatureFlag}'s whole
 * targeting logic is one tree of these — leaves test a single fact about the user
 * ({@link CountryCondition}, {@link UserIdCondition}, {@link AttributeEqualsCondition},
 * {@link PercentageRolloutCondition}); composites ({@link AndCondition}, {@link OrCondition},
 * {@link NotCondition}) combine child conditions, arbitrarily nested.
 *
 * <p>Every implementation is immutable once constructed — no setters, no mutable exposed
 * collections. That is what lets {@code FeatureFlagService.updateRules} swap a
 * {@code FeatureFlag}'s root reference atomically instead of mutating an existing tree in place:
 * a concurrent {@link #evaluate} can never observe a half-built or half-replaced tree, because no
 * tree is ever changed after construction — only replaced wholesale.
 */
public interface Condition {

    /** Tests this condition (and, for a composite, its children) against a single user's context. */
    boolean evaluate(UserContext ctx);

    /** Human-readable rendering, e.g. {@code "country == IN"} or {@code "(country == IN AND percentageRollout(10%))"} — used both in API explanations and the rule-builder UI, so evaluation is explainable rather than a black box. */
    String describe();
}

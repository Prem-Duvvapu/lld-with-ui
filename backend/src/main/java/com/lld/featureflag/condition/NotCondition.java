package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

/** Composite: inverts a single child condition. Immutable — see {@link AndCondition}'s comment. */
public class NotCondition implements Condition {

    private final Condition child;

    public NotCondition(Condition child) {
        if (child == null) {
            throw new InvalidRuleException("NotCondition requires a child condition.");
        }
        this.child = child;
    }

    public Condition getChild() {
        return child;
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        return !child.evaluate(ctx);
    }

    @Override
    public String describe() {
        return "NOT " + child.describe();
    }
}

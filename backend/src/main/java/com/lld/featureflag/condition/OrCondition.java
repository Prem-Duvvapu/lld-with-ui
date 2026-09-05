package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

import java.util.List;
import java.util.stream.Collectors;

/** Composite: matches when at least one child matches. Immutable — see {@link AndCondition}'s comment. */
public class OrCondition implements Condition {

    private final List<Condition> children;

    public OrCondition(List<Condition> children) {
        if (children == null || children.isEmpty()) {
            throw new InvalidRuleException("OrCondition requires at least one child condition.");
        }
        this.children = List.copyOf(children);
    }

    public List<Condition> getChildren() {
        return children;
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        for (Condition child : children) {
            if (child.evaluate(ctx)) return true;
        }
        return false;
    }

    @Override
    public String describe() {
        return "(" + children.stream().map(Condition::describe).collect(Collectors.joining(" OR ")) + ")";
    }
}

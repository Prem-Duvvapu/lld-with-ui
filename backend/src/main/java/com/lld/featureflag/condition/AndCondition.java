package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Composite: matches only when every child matches. Children are copied into an unmodifiable
 * {@link List} at construction and never mutated afterwards — see {@link Condition}'s class
 * comment for why that immutability is what makes concurrent evaluation safe.
 */
public class AndCondition implements Condition {

    private final List<Condition> children;

    public AndCondition(List<Condition> children) {
        if (children == null || children.isEmpty()) {
            throw new InvalidRuleException("AndCondition requires at least one child condition.");
        }
        this.children = List.copyOf(children);
    }

    public List<Condition> getChildren() {
        return children;
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        for (Condition child : children) {
            if (!child.evaluate(ctx)) return false;
        }
        return true;
    }

    @Override
    public String describe() {
        return "(" + children.stream().map(Condition::describe).collect(Collectors.joining(" AND ")) + ")";
    }
}

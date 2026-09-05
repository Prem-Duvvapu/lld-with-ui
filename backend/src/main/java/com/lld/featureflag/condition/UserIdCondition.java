package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.TreeSet;

/** Leaf condition: matches when the user's id is in a fixed allow-list (e.g. an internal beta cohort). */
public class UserIdCondition implements Condition {

    private final Set<String> allowedIds;

    public UserIdCondition(Set<String> allowedIds) {
        if (allowedIds == null || allowedIds.isEmpty()) {
            throw new InvalidRuleException("UserIdCondition requires at least one allowed user id.");
        }
        this.allowedIds = Collections.unmodifiableSet(new LinkedHashSet<>(allowedIds));
    }

    public Set<String> getAllowedIds() {
        return allowedIds;
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        return ctx != null && ctx.getUserId() != null && allowedIds.contains(ctx.getUserId());
    }

    @Override
    public String describe() {
        return "userId in " + new TreeSet<>(allowedIds);
    }
}

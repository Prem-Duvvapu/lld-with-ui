package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

/** Leaf condition: matches when {@code ctx.getAttributes().get(key)} equals a fixed value (e.g. {@code plan == premium}). */
public class AttributeEqualsCondition implements Condition {

    private final String key;
    private final String value;

    public AttributeEqualsCondition(String key, String value) {
        if (key == null || key.isBlank()) {
            throw new InvalidRuleException("AttributeEqualsCondition requires a non-blank attribute key.");
        }
        this.key = key;
        this.value = value;
    }

    public String getKey() {
        return key;
    }

    public String getValue() {
        return value;
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        if (ctx == null || ctx.getAttributes() == null) return false;
        String actual = ctx.getAttributes().get(key);
        return value == null ? actual == null : value.equals(actual);
    }

    @Override
    public String describe() {
        return key + " == " + value;
    }
}

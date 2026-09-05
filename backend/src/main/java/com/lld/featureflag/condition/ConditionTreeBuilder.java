package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Factory that turns a validated {@link RuleNodeDto} tree into a real, immutable {@link Condition}
 * composite. Every rejection is an {@link InvalidRuleException} (400), never a bare NPE or
 * ClassCastException, so a malformed rule tree from the frontend's rule builder always comes back
 * as a readable error rather than a 500.
 */
public final class ConditionTreeBuilder {

    private ConditionTreeBuilder() {
    }

    public static Condition build(RuleNodeDto dto) {
        if (dto == null || dto.getType() == null || dto.getType().isBlank()) {
            throw new InvalidRuleException("Every rule node must declare a non-blank 'type'.");
        }
        String type = dto.getType().trim().toUpperCase();
        switch (type) {
            case "COUNTRY":
                requireValue(dto, "COUNTRY");
                return new CountryCondition(dto.getValue());
            case "USERID":
                if (dto.getValues() == null || dto.getValues().isEmpty()) {
                    throw new InvalidRuleException("USERID rule node requires a non-empty 'values' list.");
                }
                return new UserIdCondition(new LinkedHashSet<>(dto.getValues()));
            case "ATTRIBUTE":
                if (dto.getKey() == null || dto.getKey().isBlank()) {
                    throw new InvalidRuleException("ATTRIBUTE rule node requires a non-blank 'key'.");
                }
                requireValue(dto, "ATTRIBUTE");
                return new AttributeEqualsCondition(dto.getKey(), dto.getValue());
            case "PERCENTAGE":
                requireValue(dto, "PERCENTAGE");
                int percentage;
                try {
                    percentage = Integer.parseInt(dto.getValue().trim());
                } catch (NumberFormatException e) {
                    throw new InvalidRuleException("PERCENTAGE rule node's 'value' must be an integer, got '" + dto.getValue() + "'.");
                }
                return new PercentageRolloutCondition(percentage);
            case "AND":
                return new AndCondition(buildChildren(dto, "AND"));
            case "OR":
                return new OrCondition(buildChildren(dto, "OR"));
            case "NOT": {
                List<Condition> kids = buildChildren(dto, "NOT");
                if (kids.size() != 1) {
                    throw new InvalidRuleException("NOT rule node requires exactly one child, got " + kids.size() + ".");
                }
                return new NotCondition(kids.get(0));
            }
            default:
                throw new InvalidRuleException("Unknown rule node type: " + dto.getType());
        }
    }

    private static void requireValue(RuleNodeDto dto, String type) {
        if (dto.getValue() == null || dto.getValue().isBlank()) {
            throw new InvalidRuleException(type + " rule node requires a non-blank 'value'.");
        }
    }

    private static List<Condition> buildChildren(RuleNodeDto dto, String type) {
        if (dto.getChildren() == null || dto.getChildren().isEmpty()) {
            throw new InvalidRuleException(type + " rule node requires at least one child in 'children'.");
        }
        return dto.getChildren().stream().map(ConditionTreeBuilder::build).collect(Collectors.toList());
    }
}

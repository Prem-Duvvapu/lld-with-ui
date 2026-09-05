package com.lld.featureflag;

import com.lld.featureflag.condition.*;
import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ConditionTreeBuilder — factory turning the wire-level RuleNodeDto into a real Condition tree")
class ConditionTreeBuilderTest {

    private RuleNodeDto node(String type) {
        RuleNodeDto dto = new RuleNodeDto();
        dto.setType(type);
        return dto;
    }

    @Test
    @DisplayName("builds a COUNTRY leaf")
    void buildsCountryLeaf() {
        RuleNodeDto dto = node("COUNTRY");
        dto.setValue("in");
        Condition c = ConditionTreeBuilder.build(dto);
        assertInstanceOf(CountryCondition.class, c);
        assertEquals("country == IN", c.describe());
    }

    @Test
    @DisplayName("builds a PERCENTAGE leaf from a numeric-looking string value")
    void buildsPercentageLeaf() {
        RuleNodeDto dto = node("PERCENTAGE");
        dto.setValue("10");
        Condition c = ConditionTreeBuilder.build(dto);
        assertInstanceOf(PercentageRolloutCondition.class, c);
        assertEquals(10, ((PercentageRolloutCondition) c).getPercentage());
    }

    @Test
    @DisplayName("builds a USERID leaf from a values list")
    void buildsUserIdLeaf() {
        RuleNodeDto dto = node("USERID");
        dto.setValues(List.of("alice", "bob"));
        Condition c = ConditionTreeBuilder.build(dto);
        assertTrue(c.evaluate(UserContext.builder().userId("alice").attributes(Map.of()).build()));
        assertFalse(c.evaluate(UserContext.builder().userId("carol").attributes(Map.of()).build()));
    }

    @Test
    @DisplayName("builds an ATTRIBUTE leaf from key + value")
    void buildsAttributeLeaf() {
        RuleNodeDto dto = node("ATTRIBUTE");
        dto.setKey("plan");
        dto.setValue("premium");
        Condition c = ConditionTreeBuilder.build(dto);
        assertTrue(c.evaluate(UserContext.builder().attributes(Map.of("plan", "premium")).build()));
    }

    @Test
    @DisplayName("builds a nested AND(country, PERCENTAGE) tree matching the example in the task spec")
    void buildsNestedAndTree() {
        RuleNodeDto country = node("COUNTRY");
        country.setValue("IN");
        RuleNodeDto percentage = node("PERCENTAGE");
        percentage.setValue("10");
        RuleNodeDto and = node("AND");
        and.setChildren(List.of(country, percentage));

        Condition c = ConditionTreeBuilder.build(and);
        assertInstanceOf(AndCondition.class, c);
        assertEquals(2, ((AndCondition) c).getChildren().size());
    }

    @Test
    @DisplayName("builds an OR tree and a NOT tree")
    void buildsOrAndNotTrees() {
        RuleNodeDto country = node("COUNTRY");
        country.setValue("IN");
        RuleNodeDto or = node("OR");
        or.setChildren(List.of(country));
        assertInstanceOf(OrCondition.class, ConditionTreeBuilder.build(or));

        RuleNodeDto not = node("NOT");
        not.setChildren(List.of(country));
        assertInstanceOf(NotCondition.class, ConditionTreeBuilder.build(not));
    }

    @Test
    @DisplayName("rejects a null tree, a blank type, and an unknown type")
    void rejectsMalformedTypes() {
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(null));
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(node(null)));
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(node("NONSENSE")));
    }

    @Test
    @DisplayName("rejects a PERCENTAGE node whose value is not an integer")
    void rejectsNonIntegerPercentage() {
        RuleNodeDto dto = node("PERCENTAGE");
        dto.setValue("not-a-number");
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(dto));
    }

    @Test
    @DisplayName("rejects AND/OR nodes with no children, and NOT with more than one child")
    void rejectsMalformedComposites() {
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(node("AND")));
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(node("OR")));

        RuleNodeDto country = node("COUNTRY");
        country.setValue("IN");
        RuleNodeDto us = node("COUNTRY");
        us.setValue("US");
        RuleNodeDto not = node("NOT");
        not.setChildren(List.of(country, us));
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(not));
    }

    @Test
    @DisplayName("rejects a USERID node with no values and an ATTRIBUTE node with no key")
    void rejectsMissingRequiredFields() {
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(node("USERID")));
        RuleNodeDto attr = node("ATTRIBUTE");
        attr.setValue("premium");
        assertThrows(InvalidRuleException.class, () -> ConditionTreeBuilder.build(attr));
    }
}

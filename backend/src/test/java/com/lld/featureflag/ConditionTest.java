package com.lld.featureflag;

import com.lld.featureflag.condition.*;
import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Condition leaves and composites — the Composite pattern in isolation, no Spring context")
class ConditionTest {

    // ---------- CountryCondition ----------

    @Test
    @DisplayName("CountryCondition matches case-insensitively and rejects a blank country")
    void countryConditionMatchesCaseInsensitively() {
        Condition c = new CountryCondition("in");
        assertTrue(c.evaluate(ctx("u1", "IN", Map.of())));
        assertTrue(c.evaluate(ctx("u1", "in", Map.of())));
        assertFalse(c.evaluate(ctx("u1", "US", Map.of())));
        assertFalse(c.evaluate(ctx("u1", null, Map.of())));
        assertEquals("country == IN", c.describe());
        assertThrows(InvalidRuleException.class, () -> new CountryCondition(" "));
        assertThrows(InvalidRuleException.class, () -> new CountryCondition(null));
    }

    // ---------- UserIdCondition ----------

    @Test
    @DisplayName("UserIdCondition matches only ids in its allow-list and rejects an empty list")
    void userIdConditionMatchesAllowList() {
        Condition c = new UserIdCondition(Set.of("u1", "u2"));
        assertTrue(c.evaluate(ctx("u1", null, Map.of())));
        assertFalse(c.evaluate(ctx("u3", null, Map.of())));
        assertFalse(c.evaluate(ctx(null, null, Map.of())));
        assertThrows(InvalidRuleException.class, () -> new UserIdCondition(Set.of()));
        assertThrows(InvalidRuleException.class, () -> new UserIdCondition(null));
    }

    // ---------- AttributeEqualsCondition ----------

    @Test
    @DisplayName("AttributeEqualsCondition matches on a single key/value pair and handles missing attributes")
    void attributeEqualsConditionMatchesKeyValue() {
        Condition c = new AttributeEqualsCondition("plan", "premium");
        assertTrue(c.evaluate(ctx("u1", null, Map.of("plan", "premium"))));
        assertFalse(c.evaluate(ctx("u1", null, Map.of("plan", "free"))));
        assertFalse(c.evaluate(ctx("u1", null, Map.of())));
        assertFalse(c.evaluate(ctx("u1", null, null)));
        assertThrows(InvalidRuleException.class, () -> new AttributeEqualsCondition(" ", "x"));
    }

    // ---------- PercentageRolloutCondition ----------

    @Test
    @DisplayName("PercentageRolloutCondition: the same userId gets the same result across 100 repeated evaluations")
    void percentageRolloutIsConsistentForSameUser() {
        Condition c = new PercentageRolloutCondition(37);
        UserContext ctx = ctx("stable-user-42", null, Map.of());
        boolean first = c.evaluate(ctx);
        for (int i = 0; i < 100; i++) {
            assertEquals(first, c.evaluate(ctx), "the same userId must always land on the same side of a fixed percentage");
        }
    }

    @Test
    @DisplayName("PercentageRolloutCondition: different userIds are NOT forced to a single fresh coin-flip result — buckets vary across a population")
    void percentageRolloutVariesAcrossUsers() {
        Condition tenPercent = new PercentageRolloutCondition(10);
        int matched = 0;
        for (int i = 0; i < 500; i++) {
            if (tenPercent.evaluate(ctx("user-" + i, null, Map.of()))) matched++;
        }
        // Roughly 10% of 500 users should match; allow generous slack since hashing isn't perfectly uniform.
        assertTrue(matched > 20 && matched < 100, "expected roughly 10% of 500 users to match, got " + matched);
    }

    @Test
    @DisplayName("PercentageRolloutCondition: 0% matches nobody, 100% matches everybody with a userId")
    void percentageRolloutBoundaries() {
        Condition never = new PercentageRolloutCondition(0);
        Condition always = new PercentageRolloutCondition(100);
        for (int i = 0; i < 50; i++) {
            UserContext ctx = ctx("user-" + i, null, Map.of());
            assertFalse(never.evaluate(ctx));
            assertTrue(always.evaluate(ctx));
        }
        assertFalse(always.evaluate(ctx(null, null, Map.of())), "no userId means no bucket, so even 100% must not match");
    }

    @Test
    @DisplayName("PercentageRolloutCondition rejects out-of-range percentages")
    void percentageRolloutRejectsOutOfRange() {
        assertThrows(InvalidRuleException.class, () -> new PercentageRolloutCondition(-1));
        assertThrows(InvalidRuleException.class, () -> new PercentageRolloutCondition(101));
    }

    // ---------- Composites ----------

    @Test
    @DisplayName("AndCondition matches only when every child matches, and rejects an empty child list")
    void andConditionRequiresAllChildren() {
        Condition c = new AndCondition(List.of(new CountryCondition("IN"), new AttributeEqualsCondition("plan", "premium")));
        assertTrue(c.evaluate(ctx("u1", "IN", Map.of("plan", "premium"))));
        assertFalse(c.evaluate(ctx("u1", "IN", Map.of("plan", "free"))));
        assertFalse(c.evaluate(ctx("u1", "US", Map.of("plan", "premium"))));
        assertThrows(InvalidRuleException.class, () -> new AndCondition(List.of()));
    }

    @Test
    @DisplayName("OrCondition matches when at least one child matches, and rejects an empty child list")
    void orConditionRequiresAnyChild() {
        Condition c = new OrCondition(List.of(new CountryCondition("IN"), new AttributeEqualsCondition("plan", "premium")));
        assertTrue(c.evaluate(ctx("u1", "IN", Map.of())));
        assertTrue(c.evaluate(ctx("u1", "US", Map.of("plan", "premium"))));
        assertFalse(c.evaluate(ctx("u1", "US", Map.of("plan", "free"))));
        assertThrows(InvalidRuleException.class, () -> new OrCondition(List.of()));
    }

    @Test
    @DisplayName("NotCondition inverts its child and rejects a null child")
    void notConditionInvertsChild() {
        Condition c = new NotCondition(new CountryCondition("IN"));
        assertFalse(c.evaluate(ctx("u1", "IN", Map.of())));
        assertTrue(c.evaluate(ctx("u1", "US", Map.of())));
        assertThrows(InvalidRuleException.class, () -> new NotCondition(null));
    }

    @Test
    @DisplayName("A 3-level-deep nested composite evaluates correctly: NOT(AND(country, OR(attribute, percentage)))")
    void threeLevelNestedCompositeEvaluatesCorrectly() {
        // Level 3 (innermost): OR(plan==premium, percentageRollout(100))
        Condition innerOr = new OrCondition(List.of(
                new AttributeEqualsCondition("plan", "premium"),
                new PercentageRolloutCondition(100)));
        // Level 2: AND(country==IN, innerOr)
        Condition middleAnd = new AndCondition(List.of(new CountryCondition("IN"), innerOr));
        // Level 1 (root): NOT(middleAnd)
        Condition root = new NotCondition(middleAnd);

        // country=IN, percentage(100%) always true -> innerOr true -> middleAnd true -> NOT -> false
        assertFalse(root.evaluate(ctx("anyone", "IN", Map.of())));
        // country=US -> middleAnd false (AND short-circuits) -> NOT -> true
        assertTrue(root.evaluate(ctx("anyone", "US", Map.of())));

        String description = root.describe();
        assertTrue(description.startsWith("NOT ("), description);
        assertTrue(description.contains("country == IN"), description);
        assertTrue(description.contains("plan == premium"), description);
        assertTrue(description.contains("percentageRollout(100%)"), description);
    }

    @Test
    @DisplayName("Condition trees are immutable: children lists are unmodifiable copies, not live views")
    void compositeChildrenAreImmutableCopies() {
        var mutableChildren = new java.util.ArrayList<Condition>();
        mutableChildren.add(new CountryCondition("IN"));
        AndCondition and = new AndCondition(mutableChildren);

        mutableChildren.add(new CountryCondition("US")); // mutate the original list after construction
        assertEquals(1, and.getChildren().size(), "AndCondition must have copied the list, not aliased it");
        assertThrows(UnsupportedOperationException.class, () -> and.getChildren().add(new CountryCondition("FR")));
    }

    private UserContext ctx(String userId, String country, Map<String, String> attributes) {
        return UserContext.builder().userId(userId).country(country).attributes(attributes).build();
    }
}

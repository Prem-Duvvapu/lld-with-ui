package com.lld.featureflag;

import com.lld.featureflag.condition.AndCondition;
import com.lld.featureflag.condition.CountryCondition;
import com.lld.featureflag.condition.OrCondition;
import com.lld.featureflag.condition.PercentageRolloutCondition;
import com.lld.featureflag.exception.DuplicateFlagKeyException;
import com.lld.featureflag.exception.FlagNotFoundException;
import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.EvaluationResult;
import com.lld.featureflag.model.FeatureFlag;
import com.lld.featureflag.model.UserContext;
import com.lld.featureflag.repository.FeatureFlagRepository;
import com.lld.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("FeatureFlagService — facade: create/enable/disable/updateRules/evaluate and every rejection")
class FeatureFlagServiceTest {

    private FeatureFlagService service;

    @BeforeEach
    void setUp() {
        service = new FeatureFlagService(new FeatureFlagRepository());
    }

    private UserContext ctx(String userId, String country) {
        return UserContext.builder().userId(userId).country(country).attributes(Map.of()).build();
    }

    @Test
    @DisplayName("createFlag stores a disabled flag with no rule by default")
    void createFlagDefaultsToDisabledWithNoRule() {
        FeatureFlag flag = service.createFlag("my-flag", "desc");
        assertFalse(flag.isEnabled());
        assertNull(flag.getRule());
        assertEquals("my-flag", flag.getKey());
        assertNotNull(flag.getId());
    }

    @Test
    @DisplayName("createFlag rejects a duplicate key")
    void createFlagRejectsDuplicateKey() {
        service.createFlag("dup", "first");
        assertThrows(DuplicateFlagKeyException.class, () -> service.createFlag("dup", "second"));
    }

    @Test
    @DisplayName("createFlag rejects a blank key")
    void createFlagRejectsBlankKey() {
        assertThrows(InvalidRuleException.class, () -> service.createFlag("", "desc"));
        assertThrows(InvalidRuleException.class, () -> service.createFlag(null, "desc"));
    }

    @Test
    @DisplayName("getFlag on an unknown key throws FlagNotFoundException")
    void getFlagUnknownKeyThrows() {
        assertThrows(FlagNotFoundException.class, () -> service.getFlag("nope"));
    }

    @Test
    @DisplayName("listFlags returns every created flag")
    void listFlagsReturnsAllCreatedFlags() {
        service.createFlag("f1", "d1");
        service.createFlag("f2", "d2");
        List<FeatureFlag> flags = service.listFlags();
        assertEquals(2, flags.size());
    }

    @Test
    @DisplayName("setEnabled flips the kill switch, and rejects an unknown key")
    void setEnabledFlipsKillSwitch() {
        service.createFlag("f1", "d1");
        FeatureFlag enabled = service.setEnabled("f1", true);
        assertTrue(enabled.isEnabled());
        FeatureFlag disabled = service.setEnabled("f1", false);
        assertFalse(disabled.isEnabled());
        assertThrows(FlagNotFoundException.class, () -> service.setEnabled("nope", true));
    }

    @Test
    @DisplayName("updateRules swaps the rule tree, and rejects a null tree or an unknown key")
    void updateRulesSwapsTreeAndRejectsInvalidInput() {
        service.createFlag("f1", "d1");
        FeatureFlag updated = service.updateRules("f1", new CountryCondition("IN"));
        assertEquals("country == IN", updated.getRule().describe());

        assertThrows(InvalidRuleException.class, () -> service.updateRules("f1", null));
        assertThrows(FlagNotFoundException.class, () -> service.updateRules("nope", new CountryCondition("IN")));
    }

    @Test
    @DisplayName("evaluate on a disabled flag always returns false, regardless of the rule")
    void evaluateDisabledFlagAlwaysFalse() {
        service.createFlag("f1", "d1");
        service.updateRules("f1", new PercentageRolloutCondition(100)); // would match everyone if enabled
        EvaluationResult result = service.evaluate("f1", ctx("u1", "IN"));
        assertFalse(result.isMatched());
        assertTrue(result.getExplanation().toLowerCase().contains("disabled"), result.getExplanation());
    }

    @Test
    @DisplayName("evaluate on an enabled flag with no rule configured returns false with an explanation")
    void evaluateEnabledFlagNoRuleReturnsFalse() {
        service.createFlag("f1", "d1");
        service.setEnabled("f1", true);
        EvaluationResult result = service.evaluate("f1", ctx("u1", "IN"));
        assertFalse(result.isMatched());
        assertTrue(result.getExplanation().toLowerCase().contains("no targeting rule"), result.getExplanation());
    }

    @Test
    @DisplayName("evaluate on an enabled flag applies the rule tree and explains the outcome")
    void evaluateEnabledFlagAppliesRule() {
        service.createFlag("f1", "d1");
        service.setEnabled("f1", true);
        service.updateRules("f1", new AndCondition(List.of(new CountryCondition("IN"))));

        EvaluationResult matched = service.evaluate("f1", ctx("u1", "IN"));
        assertTrue(matched.isMatched());
        assertTrue(matched.getExplanation().contains("MATCHED"));

        EvaluationResult notMatched = service.evaluate("f1", ctx("u1", "US"));
        assertFalse(notMatched.isMatched());
        assertTrue(notMatched.getExplanation().contains("NOT MATCHED"));
    }

    @Test
    @DisplayName("evaluate on an unknown key throws FlagNotFoundException")
    void evaluateUnknownKeyThrows() {
        assertThrows(FlagNotFoundException.class, () -> service.evaluate("nope", ctx("u1", "IN")));
    }

    @Test
    @DisplayName("a fuller targeting scenario: enable for a country, then widen with OR to a percentage rollout")
    void progressiveTargetingScenario() {
        service.createFlag("checkout-v2", "redesign");
        service.setEnabled("checkout-v2", true);
        service.updateRules("checkout-v2", new CountryCondition("IN"));
        assertTrue(service.evaluate("checkout-v2", ctx("u1", "IN")).isMatched());
        assertFalse(service.evaluate("checkout-v2", ctx("u1", "US")).isMatched());

        // Widen: now matches India OR a 100% rollout (i.e. now matches everyone with a userId)
        service.updateRules("checkout-v2", new OrCondition(List.of(
                new CountryCondition("IN"), new PercentageRolloutCondition(100))));
        assertTrue(service.evaluate("checkout-v2", ctx("u1", "US")).isMatched());
    }
}

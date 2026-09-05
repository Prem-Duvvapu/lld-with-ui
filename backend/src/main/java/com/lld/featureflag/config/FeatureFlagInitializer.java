package com.lld.featureflag.config;

import com.lld.featureflag.condition.AndCondition;
import com.lld.featureflag.condition.AttributeEqualsCondition;
import com.lld.featureflag.condition.CountryCondition;
import com.lld.featureflag.condition.OrCondition;
import com.lld.featureflag.condition.PercentageRolloutCondition;
import com.lld.featureflag.model.FeatureFlag;
import com.lld.featureflag.repository.FeatureFlagRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.List;

/** Seeds a few realistic demo flags so the operational tab shows something meaningful on first load. */
@Component
public class FeatureFlagInitializer {

    private final FeatureFlagRepository repository;

    public FeatureFlagInitializer(FeatureFlagRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        repository.save(FeatureFlag.builder()
                .key("new-checkout-flow")
                .description("Redesigned single-page checkout")
                .enabled(true)
                .rule(new AndCondition(List.of(
                        new CountryCondition("IN"),
                        new PercentageRolloutCondition(25))))
                .build());

        repository.save(FeatureFlag.builder()
                .key("dark-mode-v2")
                .description("Next iteration of the dark theme")
                .enabled(true)
                .rule(new OrCondition(List.of(
                        new AttributeEqualsCondition("plan", "premium"),
                        new PercentageRolloutCondition(10))))
                .build());

        repository.save(FeatureFlag.builder()
                .key("experimental-search")
                .description("New vector-based search backend")
                .enabled(false)
                .rule(new PercentageRolloutCondition(5))
                .build());
    }
}

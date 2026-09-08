package com.lld.webcrawler.strategy;

import com.lld.webcrawler.model.UrlFilterPolicy;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link UrlFilterPolicy} to its strategy via an EnumMap built once — the same shape as
 * {@code locker.strategy.LockerAllocationStrategyFactory}.
 */
@Component
public class UrlFilterStrategyFactory {

    private final Map<UrlFilterPolicy, UrlFilterStrategy> strategies = new EnumMap<>(UrlFilterPolicy.class);

    public UrlFilterStrategyFactory(AllowAllStrategy allowAll,
                                     RespectRobotsTxtStrategy respectRobotsTxt,
                                     DomainAllowlistStrategy domainAllowlist) {
        strategies.put(UrlFilterPolicy.ALLOW_ALL, allowAll);
        strategies.put(UrlFilterPolicy.RESPECT_ROBOTS_TXT, respectRobotsTxt);
        strategies.put(UrlFilterPolicy.DOMAIN_ALLOWLIST, domainAllowlist);
    }

    public UrlFilterStrategy forPolicy(UrlFilterPolicy policy) {
        UrlFilterStrategy strategy = strategies.get(policy);
        if (strategy == null) {
            throw new IllegalArgumentException("No UrlFilterStrategy registered for policy " + policy);
        }
        return strategy;
    }
}

package com.lld.webcrawler.strategy;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the three filter policies genuinely diverge, not just carry different names for one rule. */
public class UrlFilterStrategyTest {

    @Test
    void allowAllNeverRejectsAnything() {
        UrlFilterStrategy strategy = new AllowAllStrategy();

        assertTrue(strategy.isAllowed("http://a.com/anything", Set.of("a.com")));
        assertTrue(strategy.isAllowed("http://totally-different.com/x", Set.of("a.com")));
    }

    @Test
    void respectRobotsTxtRejectsAdminAndPrivatePaths() {
        UrlFilterStrategy strategy = new RespectRobotsTxtStrategy();

        assertFalse(strategy.isAllowed("http://a.com/admin/dashboard", Set.of("a.com")));
        assertFalse(strategy.isAllowed("http://a.com/private/data", Set.of("a.com")));
        assertTrue(strategy.isAllowed("http://a.com/public/page", Set.of("a.com")));
    }

    @Test
    void domainAllowlistOnlyAllowsSeedDomains() {
        UrlFilterStrategy strategy = new DomainAllowlistStrategy();
        Set<String> seedDomains = Set.of("a.com");

        assertTrue(strategy.isAllowed("http://a.com/child", seedDomains));
        assertFalse(strategy.isAllowed("http://off-site.com/child", seedDomains));
    }

    @Test
    void domainAllowlistRejectsMalformedUrls() {
        UrlFilterStrategy strategy = new DomainAllowlistStrategy();

        assertFalse(strategy.isAllowed("", Set.of("a.com")));
    }

    @Test
    void factoryResolvesEachPolicyToItsOwnStrategyInstance() {
        UrlFilterStrategyFactory factory = new UrlFilterStrategyFactory(
                new AllowAllStrategy(), new RespectRobotsTxtStrategy(), new DomainAllowlistStrategy());

        assertInstanceOf(AllowAllStrategy.class, factory.forPolicy(com.lld.webcrawler.model.UrlFilterPolicy.ALLOW_ALL));
        assertInstanceOf(RespectRobotsTxtStrategy.class, factory.forPolicy(com.lld.webcrawler.model.UrlFilterPolicy.RESPECT_ROBOTS_TXT));
        assertInstanceOf(DomainAllowlistStrategy.class, factory.forPolicy(com.lld.webcrawler.model.UrlFilterPolicy.DOMAIN_ALLOWLIST));
    }
}

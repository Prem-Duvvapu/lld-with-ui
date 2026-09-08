package com.lld.webcrawler.strategy;

import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Simulated {@code robots.txt}: no real network fetch of a robots file, just a deterministic
 * disallow rule (any path containing {@code /admin} or {@code /private}) so the demo has
 * something visible to reject.
 */
@Component
public class RespectRobotsTxtStrategy implements UrlFilterStrategy {

    private static final String[] DISALLOWED_SEGMENTS = {"/admin", "/private"};

    @Override
    public boolean isAllowed(String url, Set<String> seedDomains) {
        String lower = url.toLowerCase();
        for (String segment : DISALLOWED_SEGMENTS) {
            if (lower.contains(segment)) {
                return false;
            }
        }
        return true;
    }
}

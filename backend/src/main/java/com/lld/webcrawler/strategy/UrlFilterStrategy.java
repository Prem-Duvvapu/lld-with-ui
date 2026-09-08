package com.lld.webcrawler.strategy;

import java.util.Set;

/**
 * Decides whether a newly-discovered link should ever be added to the frontier. Purely a
 * pre-filter — it never sees whether a URL has already been visited (that dedup race is handled
 * separately, in {@code CrawlEngine}'s {@code ConcurrentHashMap.putIfAbsent} claim).
 */
public interface UrlFilterStrategy {
    boolean isAllowed(String url, Set<String> seedDomains);
}

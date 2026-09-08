package com.lld.webcrawler.util;

import com.lld.webcrawler.exception.InvalidSeedUrlException;

/**
 * Shared, dependency-free URL helpers used by both the crawl algorithm and the filter
 * strategies. No real networking or {@code java.net.URL} parsing — a simulated crawl only ever
 * needs the domain segment, so a small hand-rolled parser keeps this module free of any real
 * outbound-capable HTTP machinery.
 */
public final class UrlUtils {

    private UrlUtils() {
    }

    public static String extractDomain(String url) {
        if (url == null || url.isBlank()) {
            throw new InvalidSeedUrlException("URL must not be blank: " + url);
        }
        String stripped = url.trim();
        int schemeIdx = stripped.indexOf("://");
        if (schemeIdx >= 0) {
            stripped = stripped.substring(schemeIdx + 3);
        }
        if (stripped.isEmpty()) {
            throw new InvalidSeedUrlException("URL has no host: " + url);
        }
        int slashIdx = stripped.indexOf('/');
        String host = slashIdx >= 0 ? stripped.substring(0, slashIdx) : stripped;
        if (host.isBlank()) {
            throw new InvalidSeedUrlException("URL has no host: " + url);
        }
        return host;
    }

    public static boolean isWellFormed(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        try {
            extractDomain(url);
            return true;
        } catch (InvalidSeedUrlException e) {
            return false;
        }
    }
}

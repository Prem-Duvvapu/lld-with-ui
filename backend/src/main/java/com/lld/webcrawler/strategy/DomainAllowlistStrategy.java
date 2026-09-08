package com.lld.webcrawler.strategy;

import com.lld.webcrawler.util.UrlUtils;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DomainAllowlistStrategy implements UrlFilterStrategy {
    @Override
    public boolean isAllowed(String url, Set<String> seedDomains) {
        if (!UrlUtils.isWellFormed(url)) {
            return false;
        }
        return seedDomains.contains(UrlUtils.extractDomain(url));
    }
}

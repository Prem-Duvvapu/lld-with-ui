package com.lld.webcrawler.strategy;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AllowAllStrategy implements UrlFilterStrategy {
    @Override
    public boolean isAllowed(String url, Set<String> seedDomains) {
        return true;
    }
}

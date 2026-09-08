package com.lld.cachelibrary.service;

import com.lld.cachelibrary.model.EvictionPolicyType;
import com.lld.cachelibrary.model.CacheConfig;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds a few demo entries into the default live cache so the UI shows something on first load. */
@Component
public class CacheLibraryInitializer implements CommandLineRunner {

    private final CacheLibraryService cacheLibraryService;

    public CacheLibraryInitializer(CacheLibraryService cacheLibraryService) {
        this.cacheLibraryService = cacheLibraryService;
    }

    @Override
    public void run(String... args) {
        cacheLibraryService.configure(CacheConfig.builder()
                .maximumSize(20)
                .evictionPolicy(EvictionPolicyType.LRU)
                .ttlSeconds(0)
                .withStats(true)
                .shardCount(4)
                .build());
        cacheLibraryService.put("welcome", "Hello from the Generic Cache Library!");
        cacheLibraryService.put("pattern-1", "Builder");
        cacheLibraryService.put("pattern-2", "Strategy");
        cacheLibraryService.get("welcome");
    }
}

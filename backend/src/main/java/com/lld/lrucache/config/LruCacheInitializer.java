package com.lld.lrucache.config;

import com.lld.lrucache.service.LruCacheService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class LruCacheInitializer {
    private final LruCacheService cacheService;

    public LruCacheInitializer(LruCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @PostConstruct
    public void init() {
        cacheService.batchSimulate();
        cacheService.simBatchSimulate();
    }
}

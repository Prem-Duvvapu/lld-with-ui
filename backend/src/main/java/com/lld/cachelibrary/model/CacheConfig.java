package com.lld.cachelibrary.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CacheConfig {
    private int maximumSize;
    private EvictionPolicyType evictionPolicy;
    private long ttlSeconds;
    private boolean withStats;
    private int shardCount;
}

package com.lld.cachelibrary.strategy;

import com.lld.cachelibrary.model.EvictionPolicyType;

/**
 * Deliberately NOT a Spring bean, unlike most Strategy factories in this repo (which resolve to
 * one shared singleton per enum value via an EnumMap — see
 * {@code locker.strategy.LockerAllocationStrategyFactory}). An {@link EvictionPolicy} holds
 * mutable, per-shard state (access order, frequency counts, insertion order); a shared singleton
 * would let every shard of every cache built anywhere corrupt every other shard's bookkeeping.
 * This factory mints a brand-new instance on every call instead.
 */
public final class EvictionPolicyFactory {

    private EvictionPolicyFactory() {
    }

    public static <K> EvictionPolicy<K> create(EvictionPolicyType type) {
        return switch (type) {
            case LRU -> new LruEvictionPolicy<>();
            case LFU -> new LfuEvictionPolicy<>();
            case FIFO -> new FifoEvictionPolicy<>();
        };
    }
}

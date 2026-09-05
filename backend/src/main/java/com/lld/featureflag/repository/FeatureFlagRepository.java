package com.lld.featureflag.repository;

import com.lld.featureflag.model.FeatureFlag;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory store keyed by a flag's unique human key, backed by a {@link ConcurrentHashMap} so
 * {@code evaluate()} traffic (far more frequent than writes) never blocks behind a service-level
 * lock just to look a flag up. The {@link FeatureFlag} itself carries its own concurrency
 * guarantee (a volatile rule reference) for the read-during-rule-update race — this repository
 * only needs to be safe for concurrent create/find/list of whole flags.
 */
@Repository
public class FeatureFlagRepository {

    private final Map<String, FeatureFlag> flagsByKey = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    public FeatureFlag save(FeatureFlag flag) {
        if (flag.getId() == null) {
            flag.setId(idCounter.getAndIncrement());
        }
        flagsByKey.put(flag.getKey(), flag);
        return flag;
    }

    public FeatureFlag findByKey(String key) {
        return key == null ? null : flagsByKey.get(key);
    }

    public boolean existsByKey(String key) {
        return key != null && flagsByKey.containsKey(key);
    }

    public List<FeatureFlag> findAll() {
        return new ArrayList<>(flagsByKey.values());
    }

    public void clear() {
        flagsByKey.clear();
        idCounter.set(1);
    }
}

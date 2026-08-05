package com.lld.lrucache.service;

import com.lld.lrucache.model.LruCache;
import com.lld.lrucache.strategy.EvictionPolicyType;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class LruCacheService {
    private final LruCache<String, String> cache;
    private final LruCache<String, String> simCache;

    public LruCacheService() {
        this.cache = new LruCache<>(5);
        this.simCache = new LruCache<>(5);
    }

    public String get(String key) {
        return cache.get(key);
    }

    public void put(String key, String value) {
        cache.put(key, value);
    }

    public boolean remove(String key) {
        return cache.remove(key);
    }

    public void clear() {
        cache.clear();
    }

    public void setCapacity(int capacity) {
        cache.setCapacity(capacity);
    }

    public void setPolicy(EvictionPolicyType policyType) {
        cache.setPolicy(policyType);
    }

    public Map<String, Object> getSnapshot() {
        return cache.getSnapshot();
    }

    public Map<String, Object> getStats() {
        return cache.getStats();
    }

    public Map<String, Object> batchSimulate() {
        cache.clear();
        cache.put("user_101", "{ name: 'Alice', role: 'ADMIN' }");
        cache.put("user_102", "{ name: 'Bob', role: 'USER' }");
        cache.put("session_901", "JWT_TOKEN_ABC123");
        cache.put("db_query_88", "SELECT * FROM products WHERE cat='tech'");
        cache.put("user_103", "{ name: 'Charlie', role: 'VIP' }");

        // Access user_101 (Promotes to HEAD)
        cache.get("user_101");

        // Put new item (Evicts LRU item: user_102)
        cache.put("api_token_44", "BEARER_XYZ_789");

        return cache.getSnapshot();
    }

    // --- ISOLATED SIMULATION CACHE ENGINE ---
    public String simGet(String key) {
        return simCache.get(key);
    }

    public void simPut(String key, String value) {
        simCache.put(key, value);
    }

    public boolean simRemove(String key) {
        return simCache.remove(key);
    }

    public void simClear() {
        simCache.clear();
    }

    public void simSetCapacity(int capacity) {
        simCache.setCapacity(capacity);
    }

    public void simSetPolicy(EvictionPolicyType policyType) {
        simCache.setPolicy(policyType);
    }

    public Map<String, Object> getSimSnapshot() {
        return simCache.getSnapshot();
    }

    public Map<String, Object> simBatchSimulate() {
        simCache.clear();
        simCache.put("sim_user_1", "User_Alice_101");
        simCache.put("sim_session_A", "Auth_JWT_8899");
        simCache.put("sim_db_item_9", "Product_Laptop_i7");
        simCache.put("sim_api_token", "Bearer_Sec_4455");
        simCache.put("sim_cdn_edge", "Image_Banner_PNG");
        simCache.get("sim_user_1");
        return simCache.getSnapshot();
    }
}

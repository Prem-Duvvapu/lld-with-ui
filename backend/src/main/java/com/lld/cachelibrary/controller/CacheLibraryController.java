package com.lld.cachelibrary.controller;

import com.lld.cachelibrary.cache.CacheStats;
import com.lld.cachelibrary.model.CacheConfig;
import com.lld.cachelibrary.model.EvictionPolicyType;
import com.lld.cachelibrary.model.SimEvent;
import com.lld.cachelibrary.service.CacheLibraryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cachelibrary")
@CrossOrigin(origins = "*")
public class CacheLibraryController {

    private final CacheLibraryService service;

    public CacheLibraryController(CacheLibraryService service) {
        this.service = service;
    }

    @PostMapping("/configure")
    public CacheConfig configure(@RequestBody Map<String, Object> body) {
        return service.configure(parseConfig(body));
    }

    @GetMapping("/configure")
    public CacheConfig getConfig() {
        return service.getConfig();
    }

    @PutMapping("/{key}")
    public void put(@PathVariable String key, @RequestBody Map<String, String> body) {
        service.put(key, body.get("value"));
    }

    @GetMapping("/{key}")
    public Map<String, String> get(@PathVariable String key) {
        return Map.of("key", key, "value", service.get(key));
    }

    @GetMapping("/stats")
    public CacheStats getStats() {
        return service.getStats();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/configure")
    public Map<String, Object> simConfigure(@RequestBody Map<String, Object> body) {
        return service.simConfigure(parseConfig(body));
    }

    @PutMapping("/sim/{key}")
    public Map<String, Object> simPut(@PathVariable String key, @RequestBody Map<String, String> body) {
        return service.simPut(key, body.get("value"));
    }

    @GetMapping("/sim/{key}")
    public Map<String, Object> simGet(@PathVariable String key) {
        return service.simGet(key);
    }

    @PostMapping("/sim/ttl-demo")
    public Map<String, Object> simTtlExpiryDemo() throws InterruptedException {
        return service.simTtlExpiryDemo();
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) throws InterruptedException {
        int workerCount = Integer.parseInt(body.getOrDefault("workerCount", "8").toString());
        return service.simRace(workerCount);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshots();
    }

    private CacheConfig parseConfig(Map<String, Object> body) {
        int maximumSize = Integer.parseInt(body.get("maximumSize").toString());
        EvictionPolicyType policy = EvictionPolicyType.valueOf(body.getOrDefault("evictionPolicy", "LRU").toString());
        long ttlSeconds = body.containsKey("ttlSeconds") ? Long.parseLong(body.get("ttlSeconds").toString()) : 0;
        boolean withStats = Boolean.parseBoolean(body.getOrDefault("withStats", "false").toString());
        int shardCount = body.containsKey("shardCount") ? Integer.parseInt(body.get("shardCount").toString()) : 8;
        return CacheConfig.builder()
                .maximumSize(maximumSize)
                .evictionPolicy(policy)
                .ttlSeconds(ttlSeconds)
                .withStats(withStats)
                .shardCount(shardCount)
                .build();
    }
}

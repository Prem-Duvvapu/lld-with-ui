package com.lld.lrucache.controller;

import com.lld.lrucache.service.LruCacheService;
import com.lld.lrucache.strategy.EvictionPolicyType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lrucache")
@CrossOrigin(origins = "*")
public class LruCacheController {
    private final LruCacheService cacheService;

    public LruCacheController(LruCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @GetMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> getSnapshot() {
        return ResponseEntity.ok(cacheService.getSnapshot());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(cacheService.getStats());
    }

    @GetMapping("/get/{key}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String key) {
        String val = cacheService.get(key);
        return ResponseEntity.ok(Map.of(
                "key", key,
                "found", val != null,
                "value", val != null ? val : "N/A",
                "snapshot", cacheService.getSnapshot()
        ));
    }

    @PostMapping("/put")
    public ResponseEntity<Map<String, Object>> put(@RequestBody Map<String, String> request) {
        String key = request.get("key");
        String value = request.get("value");
        if (key != null && !key.trim().isEmpty()) {
            cacheService.put(key.trim(), value != null ? value : "");
        }
        return ResponseEntity.ok(cacheService.getSnapshot());
    }

    @DeleteMapping("/remove/{key}")
    public ResponseEntity<Map<String, Object>> remove(@PathVariable String key) {
        boolean removed = cacheService.remove(key);
        return ResponseEntity.ok(Map.of(
                "key", key,
                "removed", removed,
                "snapshot", cacheService.getSnapshot()
        ));
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, Object>> clear() {
        cacheService.clear();
        return ResponseEntity.ok(cacheService.getSnapshot());
    }

    @PostMapping("/capacity")
    public ResponseEntity<Map<String, Object>> setCapacity(@RequestBody Map<String, Integer> request) {
        Integer capacity = request.get("capacity");
        if (capacity != null) {
            cacheService.setCapacity(capacity);
        }
        return ResponseEntity.ok(cacheService.getSnapshot());
    }

    @PostMapping("/policy")
    public ResponseEntity<Map<String, Object>> setPolicy(@RequestBody Map<String, String> request) {
        String policyStr = request.get("policy");
        if (policyStr != null) {
            EvictionPolicyType type = EvictionPolicyType.valueOf(policyStr.toUpperCase());
            cacheService.setPolicy(type);
        }
        return ResponseEntity.ok(cacheService.getSnapshot());
    }

    @PostMapping("/batch-simulate")
    public ResponseEntity<Map<String, Object>> batchSimulate() {
        return ResponseEntity.ok(cacheService.batchSimulate());
    }

    // --- ISOLATED SIMULATION REST ENDPOINTS ---
    @GetMapping("/sim/snapshot")
    public ResponseEntity<Map<String, Object>> getSimSnapshot() {
        return ResponseEntity.ok(cacheService.getSimSnapshot());
    }

    @GetMapping("/sim/get/{key}")
    public ResponseEntity<Map<String, Object>> simGet(@PathVariable String key) {
        String val = cacheService.simGet(key);
        return ResponseEntity.ok(Map.of(
                "key", key,
                "found", val != null,
                "value", val != null ? val : "N/A",
                "snapshot", cacheService.getSimSnapshot()
        ));
    }

    @PostMapping("/sim/put")
    public ResponseEntity<Map<String, Object>> simPut(@RequestBody Map<String, String> request) {
        String key = request.get("key");
        String value = request.get("value");
        if (key != null && !key.trim().isEmpty()) {
            cacheService.simPut(key.trim(), value != null ? value : "");
        }
        return ResponseEntity.ok(cacheService.getSimSnapshot());
    }

    @DeleteMapping("/sim/remove/{key}")
    public ResponseEntity<Map<String, Object>> simRemove(@PathVariable String key) {
        boolean removed = cacheService.simRemove(key);
        return ResponseEntity.ok(Map.of(
                "key", key,
                "removed", removed,
                "snapshot", cacheService.getSimSnapshot()
        ));
    }

    @PostMapping("/sim/clear")
    public ResponseEntity<Map<String, Object>> simClear() {
        cacheService.simClear();
        return ResponseEntity.ok(cacheService.getSimSnapshot());
    }

    @PostMapping("/sim/capacity")
    public ResponseEntity<Map<String, Object>> simSetCapacity(@RequestBody Map<String, Integer> request) {
        Integer capacity = request.get("capacity");
        if (capacity != null) {
            cacheService.simSetCapacity(capacity);
        }
        return ResponseEntity.ok(cacheService.getSimSnapshot());
    }

    @PostMapping("/sim/policy")
    public ResponseEntity<Map<String, Object>> simSetPolicy(@RequestBody Map<String, String> request) {
        String policyStr = request.get("policy");
        if (policyStr != null) {
            EvictionPolicyType type = EvictionPolicyType.valueOf(policyStr.toUpperCase());
            cacheService.simSetPolicy(type);
        }
        return ResponseEntity.ok(cacheService.getSimSnapshot());
    }

    @PostMapping("/sim/batch-simulate")
    public ResponseEntity<Map<String, Object>> simBatchSimulate() {
        return ResponseEntity.ok(cacheService.simBatchSimulate());
    }
}

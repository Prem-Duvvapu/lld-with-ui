package com.lld.kvstore.controller;

import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.model.SimEvent;
import com.lld.kvstore.service.KvStoreService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kvstore")
@CrossOrigin(origins = "*")
public class KvStoreController {

    private final KvStoreService service;

    public KvStoreController(KvStoreService service) {
        this.service = service;
    }

    @PutMapping("/{key}")
    public KvEntry set(@PathVariable String key, @RequestBody Map<String, Object> body) {
        String value = body.get("value").toString();
        Long ttlSeconds = body.containsKey("ttlSeconds") ? Long.parseLong(body.get("ttlSeconds").toString()) : null;
        return service.set(key, value, ttlSeconds);
    }

    @GetMapping("/{key}")
    public KvEntry get(@PathVariable String key) {
        return service.get(key);
    }

    @DeleteMapping("/{key}")
    public void delete(@PathVariable String key) {
        service.delete(key);
    }

    @PostMapping("/{key}/cas")
    public KvEntry cas(@PathVariable String key, @RequestBody Map<String, Object> body) {
        long expectedVersion = Long.parseLong(body.get("expectedVersion").toString());
        String newValue = body.get("newValue").toString();
        return service.cas(key, expectedVersion, newValue);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PutMapping("/sim/{key}")
    public Map<String, Object> simSet(@PathVariable String key, @RequestBody Map<String, Object> body) {
        String value = body.get("value").toString();
        Long ttlSeconds = body.containsKey("ttlSeconds") ? Long.parseLong(body.get("ttlSeconds").toString()) : null;
        return service.simSet(key, value, ttlSeconds);
    }

    @GetMapping("/sim/{key}")
    public Map<String, Object> simGet(@PathVariable String key) {
        return service.simGet(key);
    }

    @PostMapping("/sim/replay")
    public Map<String, Object> simReplay() {
        return service.simReplayDemo();
    }

    @PostMapping("/sim/ttl-demo")
    public Map<String, Object> simTtlExpiryDemo() throws InterruptedException {
        return service.simTtlExpiryDemo();
    }

    @PostMapping("/sim/cas-race")
    public Map<String, Object> simCasRace(@RequestBody Map<String, Object> body) throws InterruptedException {
        int workerCount = Integer.parseInt(body.getOrDefault("workerCount", "8").toString());
        return service.simCasRace(workerCount);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshots();
    }
}

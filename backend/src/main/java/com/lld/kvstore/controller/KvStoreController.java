package com.lld.kvstore.controller;

import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.model.SimEvent;
import com.lld.kvstore.exception.InvalidKvRequestException;
import com.lld.kvstore.service.KvStoreService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.math.BigInteger;

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
        String value = stringField(body, "value");
        Long ttlSeconds = optionalInteger(body, "ttlSeconds");
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
        long expectedVersion = integerField(body, "expectedVersion");
        String newValue = stringField(body, "newValue");
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
        String value = stringField(body, "value");
        Long ttlSeconds = optionalInteger(body, "ttlSeconds");
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
        long workerCount = body.containsKey("workerCount") ? integerField(body, "workerCount") : 8;
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

    private static String stringField(Map<String, Object> body, String name) {
        if (body.get(name) instanceof String value) return value;
        throw new InvalidKvRequestException("'" + name + "' must be a string; an empty string is allowed");
    }

    private static Long optionalInteger(Map<String, Object> body, String name) {
        return body.get(name) == null ? null : integerField(body, name);
    }

    private static long integerField(Map<String, Object> body, String name) {
        Object value = body.get(name);
        // JSON decimals and strings are not silently rounded or coerced to integers.
        if (value instanceof Byte || value instanceof Short || value instanceof Integer || value instanceof Long) {
            return ((Number) value).longValue();
        }
        if (value instanceof BigInteger integer && integer.bitLength() <= 63) return integer.longValue();
        throw new InvalidKvRequestException("'" + name + "' must be a whole JSON integer in the signed 64-bit range");
    }
}

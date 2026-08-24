package com.lld.concurrency.ttlcache.controller;

import com.lld.concurrency.ttlcache.model.RunRequest;
import com.lld.concurrency.ttlcache.model.RunResult;
import com.lld.concurrency.ttlcache.service.TtlCacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the TTL Cache concurrency-primitive page. {@code /run}
 * genuinely builds a {@code ConcurrentHashMap}-backed cache with a real
 * {@code ScheduledExecutorService} background sweeper, executes a scripted
 * sequence of put/get operations in real time on a dedicated driver thread, and
 * blocks the HTTP request until the run finishes (seconds, not longer), returning
 * the full timestamped trace for the frontend to replay.
 */
@RestController
@RequestMapping("/api/concurrency/ttl-cache")
@CrossOrigin(origins = "*")
public class TtlCacheController {

    private final TtlCacheService service;

    public TtlCacheController(TtlCacheService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

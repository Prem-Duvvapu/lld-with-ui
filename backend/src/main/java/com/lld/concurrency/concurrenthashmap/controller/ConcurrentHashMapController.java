package com.lld.concurrency.concurrenthashmap.controller;

import com.lld.concurrency.concurrenthashmap.model.RunRequest;
import com.lld.concurrency.concurrenthashmap.model.RunResult;
import com.lld.concurrency.concurrenthashmap.service.ConcurrentHashMapService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Concurrent HashMap concurrency-primitive page. {@code /run}
 * genuinely spins up threads that contend on a from-scratch striped-lock map
 * ({@link com.lld.concurrency.concurrenthashmap.model.StripedHashMap}) and blocks
 * the HTTP request until the run finishes (seconds, not longer), returning the full
 * timestamped trace for the frontend to replay.
 */
@RestController
@RequestMapping("/api/concurrency/concurrent-hashmap")
@CrossOrigin(origins = "*")
public class ConcurrentHashMapController {

    private final ConcurrentHashMapService service;

    public ConcurrentHashMapController(ConcurrentHashMapService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

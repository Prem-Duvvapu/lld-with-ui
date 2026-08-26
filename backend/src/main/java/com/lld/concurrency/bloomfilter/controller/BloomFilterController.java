package com.lld.concurrency.bloomfilter.controller;

import com.lld.concurrency.bloomfilter.model.RunRequest;
import com.lld.concurrency.bloomfilter.model.RunResult;
import com.lld.concurrency.bloomfilter.service.BloomFilterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Bloom Filter concurrency-primitive page. {@code /run}
 * genuinely spins up adder threads against a from-scratch {@code BitSet}/
 * {@code ReentrantLock} Bloom filter, deterministically hunts down a genuine false
 * positive, and blocks the HTTP request until the run finishes (seconds, not
 * longer), returning the full timestamped trace for the frontend to replay.
 */
@RestController
@RequestMapping("/api/concurrency/bloom-filter")
@CrossOrigin(origins = "*")
public class BloomFilterController {

    private final BloomFilterService service;

    public BloomFilterController(BloomFilterService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

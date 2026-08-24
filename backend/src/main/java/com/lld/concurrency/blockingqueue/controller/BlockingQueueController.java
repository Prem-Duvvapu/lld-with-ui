package com.lld.concurrency.blockingqueue.controller;

import com.lld.concurrency.blockingqueue.model.RunRequest;
import com.lld.concurrency.blockingqueue.model.RunResult;
import com.lld.concurrency.blockingqueue.service.BlockingQueueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Blocking Queue concurrency-primitive page. {@code /run}
 * genuinely spins up producer/consumer threads against a from-scratch
 * {@code ReentrantLock}/{@code Condition} bounded queue and blocks the HTTP request
 * until the run finishes (seconds, not longer), returning the full timestamped
 * trace for the frontend to replay.
 */
@RestController
@RequestMapping("/api/concurrency/blocking-queue")
@CrossOrigin(origins = "*")
public class BlockingQueueController {

    private final BlockingQueueService service;

    public BlockingQueueController(BlockingQueueService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

package com.lld.concurrency.zeroevenodd.controller;

import com.lld.concurrency.zeroevenodd.model.RunRequest;
import com.lld.concurrency.zeroevenodd.model.RunResult;
import com.lld.concurrency.zeroevenodd.service.ZeroEvenOddService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Print Zero Even Odd concurrency-primitive page.
 * {@code /run} genuinely spins up three threads contending on three
 * {@code Semaphore}s and blocks the HTTP request until the run finishes,
 * returning the full timestamped trace for the frontend to replay.
 */
@RestController
@RequestMapping("/api/concurrency/zero-even-odd")
@CrossOrigin(origins = "*")
public class ZeroEvenOddController {

    private final ZeroEvenOddService service;

    public ZeroEvenOddController(ZeroEvenOddService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

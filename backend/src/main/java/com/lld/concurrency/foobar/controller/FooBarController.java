package com.lld.concurrency.foobar.controller;

import com.lld.concurrency.foobar.model.RunRequest;
import com.lld.concurrency.foobar.model.RunResult;
import com.lld.concurrency.foobar.service.FooBarService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Print FooBar Alternately concurrency-primitive page.
 * {@code /run} genuinely spins up two threads contending on a pair of
 * {@code Semaphore}s and blocks the HTTP request until the run finishes,
 * returning the full timestamped trace for the frontend to replay.
 */
@RestController
@RequestMapping("/api/concurrency/foo-bar")
@CrossOrigin(origins = "*")
public class FooBarController {

    private final FooBarService service;

    public FooBarController(FooBarService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

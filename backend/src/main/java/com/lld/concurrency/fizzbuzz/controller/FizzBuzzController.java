package com.lld.concurrency.fizzbuzz.controller;

import com.lld.concurrency.fizzbuzz.model.RunRequest;
import com.lld.concurrency.fizzbuzz.model.RunResult;
import com.lld.concurrency.fizzbuzz.service.FizzBuzzService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Multithreaded FizzBuzz concurrency-primitive page.
 * {@code /run} genuinely spins up four threads contending on one
 * {@code ReentrantLock}/{@code Condition} monitor and blocks the HTTP request
 * until the run finishes, returning the full timestamped trace for the frontend
 * to replay.
 */
@RestController
@RequestMapping("/api/concurrency/fizz-buzz")
@CrossOrigin(origins = "*")
public class FizzBuzzController {

    private final FizzBuzzService service;

    public FizzBuzzController(FizzBuzzService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

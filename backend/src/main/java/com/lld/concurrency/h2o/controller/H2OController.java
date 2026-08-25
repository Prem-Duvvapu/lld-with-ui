package com.lld.concurrency.h2o.controller;

import com.lld.concurrency.h2o.model.RunRequest;
import com.lld.concurrency.h2o.model.RunResult;
import com.lld.concurrency.h2o.service.H2OService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Building H2O concurrency-primitive page. {@code /run}
 * genuinely spins up real hydrogen/oxygen threads contending on a
 * {@code Semaphore}-bounded {@code CyclicBarrier} and blocks the HTTP request
 * until the run finishes, returning the full timestamped trace for the frontend
 * to replay.
 */
@RestController
@RequestMapping("/api/concurrency/h2o")
@CrossOrigin(origins = "*")
public class H2OController {

    private final H2OService service;

    public H2OController(H2OService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

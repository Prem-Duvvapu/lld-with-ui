package com.lld.concurrency.mergesort.controller;

import com.lld.concurrency.mergesort.model.RunRequest;
import com.lld.concurrency.mergesort.model.RunResult;
import com.lld.concurrency.mergesort.service.MergeSortService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real backend for the Multi-threaded Merge Sort concurrency-primitive page.
 * {@code /run} genuinely executes {@code ParallelMergeSorter} against a
 * {@code ForkJoinPool} with an explicit parallelism level, and blocks the HTTP
 * request until the sort finishes (seconds, not longer), returning the full
 * timestamped, thread-attributed trace for the frontend to replay as the actual
 * recursive partition/merge tree.
 */
@RestController
@RequestMapping("/api/concurrency/merge-sort")
@CrossOrigin(origins = "*")
public class MergeSortController {

    private final MergeSortService service;

    public MergeSortController(MergeSortService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public ResponseEntity<RunResult> run(@RequestBody(required = false) RunRequest request) {
        return ResponseEntity.ok(service.run(request));
    }
}

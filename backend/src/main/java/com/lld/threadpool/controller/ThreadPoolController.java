package com.lld.threadpool.controller;

import com.lld.threadpool.model.PoolStats;
import com.lld.threadpool.model.SimEvent;
import com.lld.threadpool.model.SubmitResult;
import com.lld.threadpool.service.ThreadPoolService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link ThreadPoolService}. */
@RestController
@RequestMapping("/api/threadpool")
@CrossOrigin(origins = "*")
public class ThreadPoolController {

    private final ThreadPoolService service;

    public ThreadPoolController(ThreadPoolService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @GetMapping("/pools")
    public ResponseEntity<List<PoolStats>> listPools() {
        return ResponseEntity.ok(service.listPools());
    }

    @GetMapping("/{poolId}/stats")
    public ResponseEntity<PoolStats> getStats(@PathVariable String poolId) {
        return ResponseEntity.ok(service.getStats(poolId));
    }

    @PostMapping("/{poolId}/submit")
    public ResponseEntity<SubmitResult> submit(@PathVariable String poolId, @RequestBody Map<String, Object> body) {
        String taskName = String.valueOf(body.getOrDefault("taskName", "task"));
        long durationMillis = ((Number) body.getOrDefault("durationMillis", 500)).longValue();
        return ResponseEntity.ok(service.submitTask(poolId, taskName, durationMillis));
    }

    @PostMapping("/{poolId}/resize")
    public ResponseEntity<PoolStats> resize(@PathVariable String poolId, @RequestBody Map<String, Object> body) {
        int corePoolSize = ((Number) body.get("corePoolSize")).intValue();
        int maxPoolSize = ((Number) body.get("maxPoolSize")).intValue();
        return ResponseEntity.ok(service.resizePool(poolId, corePoolSize, maxPoolSize));
    }

    @PostMapping("/{poolId}/shutdown")
    public ResponseEntity<PoolStats> shutdown(@PathVariable String poolId) {
        return ResponseEntity.ok(service.shutdownPool(poolId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/submit")
    public ResponseEntity<?> simSubmit(@RequestBody Map<String, Object> body) {
        int step = ((Number) body.getOrDefault("step", 2)).intValue();
        return ResponseEntity.ok(service.simSubmit(step));
    }

    @PostMapping("/sim/release")
    public ResponseEntity<?> simRelease(@RequestBody Map<String, Object> body) {
        int step = ((Number) body.getOrDefault("step", 7)).intValue();
        return ResponseEntity.ok(service.simReleaseOldest(step));
    }

    @PostMapping("/sim/shutdown")
    public ResponseEntity<?> simShutdown(@RequestBody(required = false) Map<String, Object> body) {
        int step = body != null && body.containsKey("step") ? ((Number) body.get("step")).intValue() : 8;
        return ResponseEntity.ok(service.simShutdown(step));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @GetMapping("/sim/snapshot")
    public ResponseEntity<?> simGetSnapshot() {
        return ResponseEntity.ok(service.getSimSnapshot());
    }
}

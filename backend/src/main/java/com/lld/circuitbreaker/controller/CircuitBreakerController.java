package com.lld.circuitbreaker.controller;

import com.lld.circuitbreaker.model.CallOutcome;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.SimEvent;
import com.lld.circuitbreaker.service.CircuitBreakerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link CircuitBreakerService}. */
@RestController
@RequestMapping("/api/circuitbreaker")
@CrossOrigin(origins = "*")
public class CircuitBreakerController {
    private final CircuitBreakerService service;

    public CircuitBreakerController(CircuitBreakerService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @GetMapping("/services")
    public ResponseEntity<List<CircuitBreaker>> listServices() {
        return ResponseEntity.ok(service.listServices());
    }

    @GetMapping("/{serviceName}/state")
    public ResponseEntity<CircuitBreaker> getState(@PathVariable String serviceName) {
        return ResponseEntity.ok(service.getService(serviceName));
    }

    @PostMapping("/{serviceName}/call")
    public ResponseEntity<CallOutcome> call(@PathVariable String serviceName, @RequestBody Map<String, Object> body) {
        boolean simulateSuccess = Boolean.TRUE.equals(body.get("simulateSuccess"));
        return ResponseEntity.ok(service.call(serviceName, simulateSuccess));
    }

    @PostMapping("/{serviceName}/reset")
    public ResponseEntity<CircuitBreaker> reset(@PathVariable String serviceName) {
        return ResponseEntity.ok(service.reset(serviceName));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/call")
    public ResponseEntity<?> simCall(@RequestBody Map<String, Object> body) {
        boolean simulateSuccess = Boolean.TRUE.equals(body.get("simulateSuccess"));
        int step = ((Number) body.getOrDefault("step", 1)).intValue();
        return ResponseEntity.ok(service.simCall(simulateSuccess, step));
    }

    @PostMapping("/sim/advance-clock")
    public ResponseEntity<?> simAdvanceClock(@RequestBody Map<String, Object> body) {
        long millis = ((Number) body.getOrDefault("millis", 1000)).longValue();
        int step = ((Number) body.getOrDefault("step", 1)).intValue();
        return ResponseEntity.ok(service.simAdvanceClock(millis, step));
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

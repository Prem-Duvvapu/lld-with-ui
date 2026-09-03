package com.lld.ratelimiter.controller;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.ClientStatus;
import com.lld.ratelimiter.model.RateLimitDecision;
import com.lld.ratelimiter.model.SimEvent;
import com.lld.ratelimiter.service.RateLimiterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link RateLimiterService}. */
@RestController
@RequestMapping("/api/ratelimiter")
@CrossOrigin(origins = "*")
public class RateLimiterController {

    private final RateLimiterService service;

    public RateLimiterController(RateLimiterService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @PostMapping("/clients/{clientId}/request")
    public ResponseEntity<RateLimitDecision> attemptRequest(@PathVariable String clientId) {
        return ResponseEntity.ok(service.attemptRequest(clientId));
    }

    @GetMapping("/clients/{clientId}/status")
    public ResponseEntity<ClientStatus> getStatus(@PathVariable String clientId) {
        return ResponseEntity.ok(service.getStatus(clientId));
    }

    @GetMapping("/clients")
    public ResponseEntity<List<ClientStatus>> listClients() {
        return ResponseEntity.ok(service.listClients());
    }

    @PutMapping("/clients/{clientId}/config")
    public ResponseEntity<ClientStatus> configureClient(@PathVariable String clientId, @RequestBody ClientConfig config) {
        return ResponseEntity.ok(service.configureClient(clientId, config));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/request")
    public ResponseEntity<?> simSendRequest(@RequestBody Map<String, Object> body) {
        int step = ((Number) body.getOrDefault("step", 2)).intValue();
        return ResponseEntity.ok(service.simSendRequest(step));
    }

    @PostMapping("/sim/advance")
    public ResponseEntity<?> simAdvanceClock(@RequestBody Map<String, Object> body) {
        long seconds = ((Number) body.getOrDefault("seconds", 1)).longValue();
        int step = ((Number) body.getOrDefault("step", 3)).intValue();
        return ResponseEntity.ok(service.simAdvanceClock(seconds, step));
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

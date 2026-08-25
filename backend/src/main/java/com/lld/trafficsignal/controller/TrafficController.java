package com.lld.trafficsignal.controller;

import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.SimEvent;
import com.lld.trafficsignal.service.TrafficSignalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link TrafficSignalService}. */
@RestController
@RequestMapping({"/api/traffic", "/api/traffic-signal"})
@CrossOrigin(origins = "*")
public class TrafficController {
    private final TrafficSignalService service;

    public TrafficController(TrafficSignalService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @GetMapping("/intersections")
    public ResponseEntity<List<Intersection>> listIntersections() {
        return ResponseEntity.ok(service.listIntersections());
    }

    @GetMapping("/intersections/{id}")
    public ResponseEntity<Intersection> getIntersection(@PathVariable int id) {
        return ResponseEntity.ok(service.getIntersection(id));
    }

    /** Back-compat single-intersection status, matching the module's original wire shape. */
    @GetMapping("/status")
    public ResponseEntity<Intersection> getStatus() {
        return ResponseEntity.ok(service.getMainIntersection());
    }

    @PostMapping("/intersections/{id}/emergency")
    public ResponseEntity<Intersection> requestEmergencyOverride(@PathVariable int id, @RequestParam int lightId) {
        return ResponseEntity.ok(service.requestEmergencyOverride(id, lightId));
    }

    @PostMapping("/intersections/{id}/resume")
    public ResponseEntity<Intersection> resumeNormalOperation(@PathVariable int id) {
        return ResponseEntity.ok(service.resumeNormalOperation(id));
    }

    @PutMapping("/intersections/{id}/lights/{lightId}")
    public ResponseEntity<Intersection> manualTransition(@PathVariable int id, @PathVariable int lightId,
                                                           @RequestParam LightState target) {
        return ResponseEntity.ok(service.manualTransition(id, lightId, target));
    }

    /** Back-compat: forces the main intersection's overdue phase to advance immediately. */
    @PostMapping("/transition")
    public ResponseEntity<Intersection> transition() {
        service.getMainIntersection().tick();
        return ResponseEntity.ok(service.getMainIntersection());
    }

    /** Back-compat single-intersection emergency override. */
    @PostMapping("/emergency")
    public ResponseEntity<Intersection> emergency(@RequestParam int lightId) {
        return ResponseEntity.ok(service.requestEmergencyOverride(service.getMainIntersection().getId(), lightId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/tick")
    public ResponseEntity<?> simTick(@RequestBody Map<String, Object> body) {
        int seconds = ((Number) body.getOrDefault("seconds", 1)).intValue();
        int step = ((Number) body.getOrDefault("step", 2)).intValue();
        return ResponseEntity.ok(service.simTick(seconds, step));
    }

    @PostMapping("/sim/emergency")
    public ResponseEntity<?> simEmergencyOverride(@RequestBody Map<String, Object> body) {
        int lightId = ((Number) body.get("lightId")).intValue();
        int step = ((Number) body.getOrDefault("step", 5)).intValue();
        return ResponseEntity.ok(service.simEmergencyOverride(lightId, step));
    }

    @PostMapping("/sim/resume")
    public ResponseEntity<?> simResume(@RequestBody(required = false) Map<String, Object> body) {
        int step = body != null && body.containsKey("step") ? ((Number) body.get("step")).intValue() : 7;
        return ResponseEntity.ok(service.simResume(step));
    }

    @PostMapping("/sim/manual-transition")
    public ResponseEntity<?> simManualTransition(@RequestBody Map<String, Object> body) {
        int lightId = ((Number) body.get("lightId")).intValue();
        LightState target = LightState.valueOf(String.valueOf(body.get("target")).toUpperCase());
        int step = ((Number) body.getOrDefault("step", 4)).intValue();
        return ResponseEntity.ok(service.simManualTransition(lightId, target, step));
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

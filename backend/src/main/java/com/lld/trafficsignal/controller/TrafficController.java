package com.lld.trafficsignal.controller;

import com.lld.trafficsignal.model.TrafficLight;
import com.lld.trafficsignal.service.TrafficService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
@CrossOrigin(origins = "*")
public class TrafficController {

    private final TrafficService service;

    public TrafficController(TrafficService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public List<TrafficLight> getStatus() {
        return service.getStatus();
    }

    @PostMapping("/transition")
    public ResponseEntity<?> transition() {
        service.transition();
        return ResponseEntity.ok(Map.of("message", "Transitioned to next light"));
    }

    @PostMapping("/emergency")
    public ResponseEntity<?> emergency(@RequestParam int lightId) {
        service.emergencyOverride(lightId);
        return ResponseEntity.ok(Map.of("message", "Emergency override set for light " + lightId));
    }

    @PostMapping("/timer")
    public ResponseEntity<?> setTimer(@RequestBody Map<String, Integer> request) {
        int lightId = request.get("lightId");
        int seconds = request.get("seconds");
        service.setTimer(lightId, seconds);
        return ResponseEntity.ok(Map.of("message", "Timer set for light " + lightId));
    }
}

package com.lld.trafficsignal.controller;

import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.service.TrafficService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
@CrossOrigin(origins = "*")
public class TrafficController {
    private final TrafficService trafficService;

    public TrafficController(TrafficService trafficService) {
        this.trafficService = trafficService;
    }

    @GetMapping("/status")
    public ResponseEntity<Intersection> getStatus() {
        return ResponseEntity.ok(trafficService.getStatus());
    }

    @PostMapping("/transition")
    public ResponseEntity<Intersection> transition() {
        trafficService.transition();
        return ResponseEntity.ok(trafficService.getStatus());
    }

    @PostMapping("/emergency")
    public ResponseEntity<Intersection> emergency(@RequestParam int lightId) {
        trafficService.emergencyOverride(lightId);
        return ResponseEntity.ok(trafficService.getStatus());
    }
}

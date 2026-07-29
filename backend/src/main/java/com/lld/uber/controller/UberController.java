package com.lld.uber.controller;

import com.lld.uber.model.Ride;
import com.lld.uber.service.UberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/uber")
@CrossOrigin(origins = "*")
public class UberController {

    private final UberService service;

    public UberController(UberService service) {
        this.service = service;
    }

    @GetMapping("/estimate")
    public ResponseEntity<?> estimate(
            @RequestParam String pickupLat, @RequestParam String pickupLng,
            @RequestParam(defaultValue = "Pickup") String pickupLabel,
            @RequestParam String dropoffLat, @RequestParam String dropoffLng,
            @RequestParam(defaultValue = "Dropoff") String dropoffLabel,
            @RequestParam(defaultValue = "UBER_GO") String vehicleType) {
        try {
            return ResponseEntity.ok(service.estimate(pickupLat, pickupLng, pickupLabel,
                    dropoffLat, dropoffLng, dropoffLabel, vehicleType));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rides")
    public ResponseEntity<?> requestRide(@RequestBody Map<String, String> body) {
        try {
            Ride ride = service.requestRide(
                    body.get("userId"),
                    body.get("pickupLat"), body.get("pickupLng"), body.get("pickupLabel"),
                    body.get("dropoffLat"), body.get("dropoffLng"), body.get("dropoffLabel"),
                    body.get("vehicleType")
            );
            return ResponseEntity.ok(ride);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/rides/{id}")
    public ResponseEntity<?> getRide(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getRide(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/rides")
    public List<Ride> getUserRides(@RequestParam String userId) {
        return service.getUserRides(userId);
    }

    @PutMapping("/rides/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.updateStatus(id, body.get("status")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

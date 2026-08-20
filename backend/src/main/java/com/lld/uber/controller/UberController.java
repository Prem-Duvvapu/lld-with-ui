package com.lld.uber.controller;

import com.lld.config.ErrorResponse;

import com.lld.uber.model.*;
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

    @PostMapping("/riders")
    public Rider registerRider(@RequestBody Rider rider) {
        return service.registerRider(rider);
    }

    @GetMapping("/riders")
    public List<Rider> getRiders() {
        return service.getAllRiders();
    }

    @PostMapping("/drivers")
    public Driver registerDriver(@RequestBody Driver driver) {
        return service.registerDriver(driver);
    }

    @GetMapping("/drivers")
    public List<Driver> getDrivers() {
        return service.getAllDrivers();
    }

    @PutMapping("/drivers/{id}/status")
    public Driver updateDriverStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        DriverStatus status = DriverStatus.valueOf(statusStr.toUpperCase());
        return service.updateDriverStatus(id, status);
    }

    @GetMapping("/drivers/{driverId}/requests")
    public List<Ride> getDriverRequests(@PathVariable String driverId) {
        return service.getAvailableRideRequestsForDriver(driverId);
    }

    @GetMapping("/estimate")
    public UberService.FareEstimate estimate(
            @RequestParam String pickupLat, @RequestParam String pickupLng, @RequestParam(defaultValue = "Pickup") String pickupLabel,
            @RequestParam String dropoffLat, @RequestParam String dropoffLng, @RequestParam(defaultValue = "Dropoff") String dropoffLabel,
            @RequestParam(defaultValue = "UBER_GO") String vehicleType,
            @RequestParam(defaultValue = "false") boolean surge) {
        return service.estimate(pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel, vehicleType, surge);
    }

    @PostMapping("/rides")
    public Ride requestRide(@RequestBody Map<String, String> req) {
        Double fare = req.containsKey("fare") && req.get("fare") != null ? Double.parseDouble(req.get("fare")) : null;
        Double distanceKm = req.containsKey("distanceKm") && req.get("distanceKm") != null ? Double.parseDouble(req.get("distanceKm")) : null;
        return service.requestRide(
                req.getOrDefault("userId", "RIDER-001"),
                req.get("pickupLat"), req.get("pickupLng"), req.getOrDefault("pickupLabel", "Pickup"),
                req.get("dropoffLat"), req.get("dropoffLng"), req.getOrDefault("dropoffLabel", "Dropoff"),
                req.getOrDefault("vehicleType", "UBER_GO"),
                fare,
                distanceKm
        );
    }

    @PutMapping("/rides/{id}/accept")
    public Ride acceptRide(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.acceptRide(id, body.get("driverId"));
    }

    @PutMapping("/rides/{id}/decline")
    public Ride declineRide(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.declineRide(id, body.get("driverId"));
    }

    @PutMapping("/rides/{id}/assign")
    public Ride assignDriver(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.assignDriver(id, body.get("driverId"));
    }

    @PutMapping("/rides/{id}/verify-otp")
    public ResponseEntity<?> verifyOtp(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            Ride ride = service.verifyOtpAndStart(id, body.get("otp"));
            return ResponseEntity.ok(ride);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PutMapping("/rides/{id}/start")
    public Ride startTrip(@PathVariable String id) {
        return service.startTrip(id);
    }

    @PutMapping("/rides/{id}/arrive")
    public Ride arriveAtDestination(@PathVariable String id) {
        return service.arriveAtDestination(id);
    }

    @PutMapping("/rides/{id}/complete")
    public Ride completeTrip(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String method = body != null ? body.get("paymentMethod") : "UPI";
        return service.completeTrip(id, method);
    }

    @PutMapping("/rides/{id}/cancel")
    public Ride cancelTrip(@PathVariable String id) {
        return service.cancelTrip(id);
    }

    @PutMapping("/rides/{id}/status")
    public Ride updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        if ("ONGOING".equalsIgnoreCase(statusStr) || "STARTED".equalsIgnoreCase(statusStr) || "IN_PROGRESS".equalsIgnoreCase(statusStr)) {
            return service.startTrip(id);
        } else if ("COMPLETED".equalsIgnoreCase(statusStr)) {
            return service.completeTrip(id, body.getOrDefault("paymentMethod", "UPI"));
        } else if ("CANCELLED".equalsIgnoreCase(statusStr)) {
            return service.cancelTrip(id);
        }
        return service.getRide(id);
    }

    @GetMapping("/rides/{id}")
    public Ride getRide(@PathVariable String id) {
        return service.getRide(id);
    }

    @GetMapping("/rides")
    public List<Ride> getRides(@RequestParam(required = false) String userId) {
        if (userId != null && !userId.isEmpty()) {
            return service.getUserRides(userId);
        }
        return service.getAllRides();
    }
}

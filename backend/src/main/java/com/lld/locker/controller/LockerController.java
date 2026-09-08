package com.lld.locker.controller;

import com.lld.locker.model.*;
import com.lld.locker.service.LockerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/locker")
@CrossOrigin(origins = "*")
public class LockerController {

    private final LockerService service;

    public LockerController(LockerService service) {
        this.service = service;
    }

    @GetMapping("/banks")
    public List<LockerBank> getBanks() {
        return service.getAllBanks();
    }

    @GetMapping("/banks/{bankId}/lockers")
    public List<Locker> getLockersInBank(@PathVariable String bankId) {
        return service.getLockersInBank(bankId);
    }

    @PostMapping("/deposit")
    public Parcel deposit(@RequestBody Map<String, Object> body) {
        String bankId = body.get("bankId").toString();
        LockerSize size = LockerSize.valueOf(body.get("size").toString());
        String courierId = body.get("courierId").toString();
        String recipientId = body.get("recipientId").toString();
        AllocationPolicy policy = AllocationPolicy.valueOf(body.getOrDefault("policy", "SMALLEST_FIT").toString());
        return service.deposit(bankId, size, courierId, recipientId, policy);
    }

    @PostMapping("/pickup")
    public Parcel pickup(@RequestBody Map<String, String> body) {
        return service.pickup(body.get("pickupCode"));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/deposit")
    public Map<String, Object> simDeposit(@RequestBody Map<String, Object> body) {
        String courierId = body.get("courierId").toString();
        String recipientId = body.get("recipientId").toString();
        LockerSize size = LockerSize.valueOf(body.get("size").toString());
        AllocationPolicy policy = AllocationPolicy.valueOf(body.getOrDefault("policy", "SMALLEST_FIT").toString());
        return service.simDeposit(courierId, recipientId, size, policy);
    }

    @PostMapping("/sim/pickup")
    public Map<String, Object> simPickup(@RequestBody Map<String, String> body) {
        return service.simPickup(body.get("pickupCode"));
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) throws InterruptedException {
        int courierCount = Integer.parseInt(body.get("courierCount").toString());
        LockerSize size = LockerSize.valueOf(body.get("size").toString());
        AllocationPolicy policy = AllocationPolicy.valueOf(body.getOrDefault("policy", "SMALLEST_FIT").toString());
        return service.simRace(courierCount, size, policy);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshots();
    }
}

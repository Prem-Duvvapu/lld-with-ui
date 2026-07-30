package com.lld.parkinglot.controller;

import com.lld.parkinglot.dto.ParkingSpotRequestDto;
import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.Gate;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.service.ParkingLotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parking")
@CrossOrigin(origins = "*")
public class ParkingLotController {

    private final ParkingLotService service;

    public ParkingLotController(ParkingLotService service) {
        this.service = service;
    }

    @GetMapping("/gates")
    public List<Gate> getGates() {
        return service.getGates();
    }

    @PostMapping("/entry")
    public ResponseEntity<?> entry(@Valid @RequestBody ParkingSpotRequestDto parkingSpotRequestDto) {
        try {
            Ticket ticket = service.entry(parkingSpotRequestDto);
            return ResponseEntity.ok(ticket);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/exit")
    public ResponseEntity<?> exit(@RequestBody Map<String, String> request) {
        try {
            String gateId = request.get("gateId");
            String ticketNumber = request.get("ticketNumber");
            Ticket ticket = service.exit(gateId, ticketNumber);
            return ResponseEntity.ok(ticket);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/floors")
    public List<Floor> getFloors() {
        return service.getFloors();
    }

    @GetMapping("/tickets/active")
    public List<Ticket> getActiveTickets() {
        return service.getActiveTickets();
    }

    @GetMapping("/spots/available")
    public List<ParkingSpot> getAvailableSpots(@RequestParam(required = false) String vehicleType) {
        if (vehicleType != null) {
            return service.getAvailableSpotsByType(vehicleType);
        }
        return service.getAvailableSpots();
    }
}

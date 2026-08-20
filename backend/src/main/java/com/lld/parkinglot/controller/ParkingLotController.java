package com.lld.parkinglot.controller;

import com.lld.config.ErrorResponse;

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
    private final com.lld.parkinglot.service.ParkingLotDocumentationService docService;

    public ParkingLotController(ParkingLotService service, com.lld.parkinglot.service.ParkingLotDocumentationService docService) {
        this.service = service;
        this.docService = docService;
    }

    @GetMapping("/class-diagram")
    public ResponseEntity<?> getClassDiagram() {
        return ResponseEntity.ok(docService.getClassDiagram());
    }

    @GetMapping("/design-details")
    public ResponseEntity<?> getDesignDetails() {
        return ResponseEntity.ok(docService.getDesignDetails());
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
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/exit/scan")
    public ResponseEntity<?> scanExit(@RequestBody Map<String, String> request) {
        try {
            String gateId = request.get("gateId");
            String ticketNumber = request.get("ticketNumber");
            String pricingStrategy = request.getOrDefault("pricingStrategy", "HOURLY");
            Ticket preview = service.scanTicket(gateId, ticketNumber, pricingStrategy);
            return ResponseEntity.ok(preview);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/exit/pay")
    public ResponseEntity<?> payExit(@RequestBody Map<String, String> request) {
        try {
            String gateId = request.get("gateId");
            String ticketNumber = request.get("ticketNumber");
            String pricingStrategy = request.getOrDefault("pricingStrategy", "HOURLY");
            String paymentMethod = request.getOrDefault("paymentMethod", "CASH");
            Ticket ticket = service.payAndExit(gateId, ticketNumber, pricingStrategy, paymentMethod);
            return ResponseEntity.ok(ticket);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/exit")
    public ResponseEntity<?> exit(@RequestBody Map<String, String> request) {
        try {
            String gateId = request.get("gateId");
            String ticketNumber = request.get("ticketNumber");
            String pricingStrategy = request.getOrDefault("pricingStrategy", "HOURLY");
            Ticket ticket = service.exit(gateId, ticketNumber, pricingStrategy);
            return ResponseEntity.ok(ticket);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
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

package com.lld.parkinglot.controller;

import com.lld.parkinglot.dto.ParkingSpotRequestDto;
import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.Gate;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.SimEvent;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.service.ParkingLotService;
import com.lld.parkinglot.service.ParkingLotSimService;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parking")
@CrossOrigin(origins = "*")
public class ParkingLotController {

    private final ParkingLotService service;
    private final ParkingLotSimService simService;

    public ParkingLotController(ParkingLotService service, ParkingLotSimService simService) {
        this.service = service;
        this.simService = simService;
    }

    @GetMapping("/gates")
    public List<Gate> getGates() {
        return service.getGates();
    }

    @PostMapping("/entry")
    public Ticket entry(@Valid @RequestBody ParkingSpotRequestDto parkingSpotRequestDto) {
        return service.entry(parkingSpotRequestDto);
    }

    @PostMapping("/exit/scan")
    public Ticket scanExit(@RequestBody Map<String, String> request) {
        String gateId = request.get("gateId");
        String ticketNumber = request.get("ticketNumber");
        String pricingStrategy = request.getOrDefault("pricingStrategy", "HOURLY");
        return service.scanTicket(gateId, ticketNumber, pricingStrategy);
    }

    @PostMapping("/exit/pay")
    public Ticket payExit(@RequestBody Map<String, String> request) {
        String gateId = request.get("gateId");
        String ticketNumber = request.get("ticketNumber");
        String pricingStrategy = request.getOrDefault("pricingStrategy", "HOURLY");
        String paymentMethod = request.getOrDefault("paymentMethod", "CASH");
        return service.payAndExit(gateId, ticketNumber, pricingStrategy, paymentMethod);
    }

    @PostMapping("/exit")
    public Ticket exit(@RequestBody Map<String, String> request) {
        String gateId = request.get("gateId");
        String ticketNumber = request.get("ticketNumber");
        String pricingStrategy = request.getOrDefault("pricingStrategy", "HOURLY");
        return service.exit(gateId, ticketNumber, pricingStrategy);
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

    // ------------------------------------------------------- isolated /sim/* sandbox

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        return simService.reset();
    }

    @PostMapping("/sim/entry")
    public Map<String, Object> simEntry(@RequestBody Map<String, String> request) {
        return simService.entry(request.get("vehicleNumber"), request.get("vehicleType"), request.getOrDefault("strategy", "NEAREST"));
    }

    @PostMapping("/sim/scan")
    public Map<String, Object> simScan(@RequestBody Map<String, String> request) {
        return simService.scan(request.get("ticketNumber"), request.getOrDefault("pricingStrategy", "HOURLY"));
    }

    @PostMapping("/sim/pay")
    public Map<String, Object> simPay(@RequestBody Map<String, String> request) {
        return simService.pay(request.get("ticketNumber"), request.getOrDefault("pricingStrategy", "HOURLY"), request.getOrDefault("paymentMethod", "CASH"));
    }

    @GetMapping("/sim/state")
    public Map<String, Object> simState() {
        return simService.getState();
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simEvents() {
        return simService.getEvents();
    }
}

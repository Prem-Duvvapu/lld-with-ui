package com.lld.carrental.controller;

import com.lld.carrental.model.*;
import com.lld.carrental.service.CarRentalService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/car-rental")
@CrossOrigin(origins = "*")
public class CarRentalController {

    private final CarRentalService service;

    public CarRentalController(CarRentalService service) {
        this.service = service;
    }

    // ---- Branches ----
    @GetMapping("/branches")
    public List<RentalBranch> getBranches() {
        return service.getAllBranches();
    }

    @GetMapping("/branches/{id}")
    public RentalBranch getBranch(@PathVariable String id) {
        return service.getBranch(id);
    }

    // ---- Vehicles ----
    @GetMapping("/vehicles")
    public List<Vehicle> getVehicles(@RequestParam(required = false) String branchId) {
        return branchId != null ? service.getVehiclesByBranch(branchId) : service.getAllVehicles();
    }

    @GetMapping("/vehicles/{id}")
    public Vehicle getVehicle(@PathVariable String id) {
        return service.getVehicle(id);
    }

    @GetMapping("/vehicles/available")
    public List<Vehicle> searchAvailable(@RequestParam(required = false) String branchId,
                                          @RequestParam(required = false) String type,
                                          @RequestParam String startDate,
                                          @RequestParam String endDate) {
        VehicleType vehicleType = (type != null && !type.isEmpty()) ? VehicleType.valueOf(type.toUpperCase()) : null;
        return service.searchAvailableVehicles(branchId, vehicleType, LocalDate.parse(startDate), LocalDate.parse(endDate));
    }

    // ---- Customers ----
    @PostMapping("/customers")
    public Customer registerCustomer(@RequestBody Customer customer) {
        return service.registerCustomer(customer);
    }

    @GetMapping("/customers")
    public List<Customer> getCustomers() {
        return service.getAllCustomers();
    }

    @GetMapping("/customers/{id}")
    public Customer getCustomer(@PathVariable String id) {
        return service.getCustomer(id);
    }

    // ---- Pricing ----
    @GetMapping("/estimate")
    public Map<String, Object> estimate(@RequestParam String type, @RequestParam String startDate, @RequestParam String endDate) {
        VehicleType vehicleType = VehicleType.valueOf(type.toUpperCase());
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        double cost = service.estimateCost(vehicleType, start, end);
        return Map.of("estimatedCost", cost, "days", java.time.temporal.ChronoUnit.DAYS.between(start, end));
    }

    // ---- Reservations ----
    @PostMapping("/reservations")
    public Reservation reserve(@RequestBody Map<String, String> body) {
        return service.reserveVehicle(
                body.get("customerId"),
                body.get("vehicleId"),
                LocalDate.parse(body.get("startDate")),
                LocalDate.parse(body.get("endDate")));
    }

    @PutMapping("/reservations/{id}/confirm")
    public Reservation confirm(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String method = body != null ? body.getOrDefault("paymentMethod", "UPI") : "UPI";
        return service.confirmReservation(id, PaymentMethod.valueOf(method.toUpperCase()));
    }

    @PutMapping("/reservations/{id}/pickup")
    public Reservation pickup(@PathVariable String id) {
        return service.pickup(id);
    }

    @PutMapping("/reservations/{id}/return")
    public Reservation returnVehicle(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        int odometer = body != null && body.get("odometerReading") != null ? Integer.parseInt(body.get("odometerReading")) : 0;
        LocalDate actualReturnDate = body != null && body.get("actualReturnDate") != null
                ? LocalDate.parse(body.get("actualReturnDate")) : null;
        return service.returnVehicle(id, odometer, actualReturnDate);
    }

    @PutMapping("/reservations/{id}/cancel")
    public Reservation cancel(@PathVariable String id) {
        return service.cancelReservation(id);
    }

    @GetMapping("/reservations/{id}")
    public Reservation getReservation(@PathVariable String id) {
        return service.getReservation(id);
    }

    @GetMapping("/reservations")
    public List<Reservation> getReservations(@RequestParam(required = false) String customerId) {
        return customerId != null ? service.getCustomerReservations(customerId) : service.getAllReservations();
    }

    // ================= Isolated simulation sandbox =================

    @PostMapping("/sim/reset")
    public Map<String, String> simReset() {
        service.simReset();
        return Map.of("status", "reset");
    }

    @PostMapping("/sim/vehicles")
    public Vehicle simSeedVehicle(@RequestBody Vehicle vehicle) {
        return service.simSeedVehicle(vehicle);
    }

    @PostMapping("/sim/customers")
    public Customer simSeedCustomer(@RequestBody Customer customer) {
        return service.simSeedCustomer(customer);
    }

    @GetMapping("/sim/vehicles")
    public List<Vehicle> simGetVehicles() {
        return service.simGetVehicles();
    }

    @GetMapping("/sim/reservations")
    public List<Reservation> simGetReservations() {
        return service.simGetReservations();
    }

    @PostMapping("/sim/reservations")
    public Reservation simReserve(@RequestBody Map<String, String> body) {
        return service.simReserve(
                body.get("customerId"),
                body.get("vehicleId"),
                LocalDate.parse(body.get("startDate")),
                LocalDate.parse(body.get("endDate")));
    }

    @PutMapping("/sim/reservations/{id}/confirm")
    public Reservation simConfirm(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String method = body != null ? body.getOrDefault("paymentMethod", "UPI") : "UPI";
        return service.simConfirm(id, PaymentMethod.valueOf(method.toUpperCase()));
    }

    @PutMapping("/sim/reservations/{id}/pickup")
    public Reservation simPickup(@PathVariable String id) {
        return service.simPickup(id);
    }

    @PutMapping("/sim/reservations/{id}/return")
    public Reservation simReturn(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        int odometer = body != null && body.get("odometerReading") != null ? Integer.parseInt(body.get("odometerReading")) : 0;
        return service.simReturn(id, odometer);
    }

    @PutMapping("/sim/reservations/{id}/cancel")
    public Reservation simCancel(@PathVariable String id) {
        return service.simCancel(id);
    }
}

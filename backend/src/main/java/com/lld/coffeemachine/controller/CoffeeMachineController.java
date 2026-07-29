package com.lld.coffeemachine.controller;

import com.lld.coffeemachine.model.Beverage;
import com.lld.coffeemachine.model.Order;
import com.lld.coffeemachine.service.CoffeeMachineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/coffee-machine")
@CrossOrigin(origins = "*")
public class CoffeeMachineController {
    private final CoffeeMachineService service;

    public CoffeeMachineController(CoffeeMachineService service) {
        this.service = service;
    }

    @GetMapping("/menu")
    public List<Beverage> getMenu() {
        return service.getMenu();
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return service.getStatus();
    }

    @PostMapping("/select")
    public ResponseEntity<?> selectBeverage(@RequestBody Map<String, Long> request) {
        try {
            return ResponseEntity.ok(service.selectBeverage(request.get("beverageId")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/brew")
    public ResponseEntity<?> brew(@RequestBody Map<String, Long> request) {
        try {
            return ResponseEntity.ok(service.brew(request.get("beverageId")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/refill")
    public ResponseEntity<?> refill(@RequestBody Map<String, Object> request) {
        String ingredient = (String) request.get("ingredient");
        int amount = ((Number) request.get("amount")).intValue();
        return ResponseEntity.ok(service.refillIngredient(ingredient, amount));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset() {
        return ResponseEntity.ok(service.resetMachine());
    }

    @GetMapping("/orders")
    public List<Order> getOrders() {
        return service.getOrders();
    }
}
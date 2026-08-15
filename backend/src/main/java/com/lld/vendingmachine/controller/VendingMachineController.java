package com.lld.vendingmachine.controller;

import com.lld.vendingmachine.service.VendingMachineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/vending-machine")
@CrossOrigin(origins = "*")
public class VendingMachineController {
    private final VendingMachineService service;

    public VendingMachineController(VendingMachineService service) {
        this.service = service;
    }

    @GetMapping("/products")
    public ResponseEntity<?> getProducts() {
        try {
            return ResponseEntity.ok(service.getProducts());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/select")
    public ResponseEntity<?> selectProduct(@RequestBody Map<String, Object> body) {
        try {
            long productId = ((Number) body.get("productId")).longValue();
            int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
            return ResponseEntity.ok(service.selectProduct(productId, quantity));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{transactionId}/insert-coin")
    public ResponseEntity<?> insertCoin(@PathVariable long transactionId, @RequestBody Map<String, Object> body) {
        try {
            double amount = ((Number) body.get("amount")).doubleValue();
            return ResponseEntity.ok(service.insertCoin(transactionId, amount));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{transactionId}/dispense")
    public ResponseEntity<?> dispense(@PathVariable long transactionId) {
        try {
            return ResponseEntity.ok(service.dispense(transactionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{transactionId}/cancel")
    public ResponseEntity<?> cancel(@PathVariable long transactionId) {
        try {
            return ResponseEntity.ok(service.cancelTransaction(transactionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

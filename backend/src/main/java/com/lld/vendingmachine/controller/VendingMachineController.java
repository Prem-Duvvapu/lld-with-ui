package com.lld.vendingmachine.controller;

import com.lld.vendingmachine.exception.*;
import com.lld.vendingmachine.model.Product;
import com.lld.vendingmachine.model.Slot;
import com.lld.vendingmachine.model.Transaction;
import com.lld.vendingmachine.service.VendingMachineService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/vendingmachine", "/api/vending-machine"})
@CrossOrigin(origins = "*")
public class VendingMachineController {
    private final VendingMachineService service;

    public VendingMachineController(VendingMachineService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @GetMapping("/slots")
    public ResponseEntity<List<Slot>> getSlots() {
        return ResponseEntity.ok(service.getSlots());
    }

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts() {
        return ResponseEntity.ok(service.getProducts());
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(service.getStatus());
    }

    @GetMapping("/change-inventory")
    public ResponseEntity<Map<String, Integer>> getChangeInventory() {
        return ResponseEntity.ok(service.getChangeInventory());
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Transaction>> getTransactions() {
        return ResponseEntity.ok(service.getTransactionHistory());
    }

    @PostMapping("/select")
    public ResponseEntity<?> selectProduct(@RequestBody Map<String, Object> body) {
        try {
            String slotCode = (String) body.get("slotCode");
            if (slotCode == null && body.containsKey("productId")) {
                // Compatibility for numeric ID
                long pId = ((Number) body.get("productId")).longValue();
                slotCode = service.getSlots().stream()
                        .filter(s -> s.getProduct() != null && s.getProduct().getId() == pId)
                        .map(Slot::getCode)
                        .findFirst().orElse(null);
            }
            if (slotCode == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "slotCode is required"));
            }
            return ResponseEntity.ok(service.selectProduct(slotCode));
        } catch (SlotNotFoundException | ProductNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (OutOfStockException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/insert-money", "/insert-coin", "/{transactionId}/insert-coin"})
    public ResponseEntity<?> insertMoney(@RequestBody Map<String, Object> body) {
        try {
            int amount = 0;
            if (body.containsKey("denomination")) {
                amount = ((Number) body.get("denomination")).intValue();
            } else if (body.containsKey("amount")) {
                amount = ((Number) body.get("amount")).intValue();
            }
            return ResponseEntity.ok(service.insertMoney(amount));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/dispense", "/{transactionId}/dispense"})
    public ResponseEntity<?> dispense() {
        try {
            return ResponseEntity.ok(service.dispense());
        } catch (InsufficientPaymentException e) {
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("error", e.getMessage()));
        } catch (InsufficientChangeException | OutOfStockException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/cancel", "/{transactionId}/cancel"})
    public ResponseEntity<?> cancel() {
        try {
            return ResponseEntity.ok(service.cancelTransaction());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/restock")
    public ResponseEntity<?> restock(@RequestBody Map<String, Object> body) {
        try {
            String slotCode = (String) body.get("slotCode");
            int quantity = ((Number) body.getOrDefault("quantity", 5)).intValue();
            service.restockSlot(slotCode, quantity);
            return ResponseEntity.ok(Map.of("message", "Slot " + slotCode + " restocked successfully", "slots", service.getSlots()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/refill-change")
    public ResponseEntity<?> refillChange(@RequestBody Map<String, Object> body) {
        try {
            int denom = ((Number) body.get("denomination")).intValue();
            int count = ((Number) body.getOrDefault("count", 10)).intValue();
            service.refillChange(denom, count);
            return ResponseEntity.ok(Map.of("message", "Refilled " + count + " units of ₹" + denom, "inventory", service.getChangeInventory()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/select")
    public ResponseEntity<?> simSelectProduct(@RequestBody Map<String, Object> body) {
        try {
            String slotCode = (String) body.get("slotCode");
            int step = ((Number) body.getOrDefault("stepNumber", 2)).intValue();
            return ResponseEntity.ok(service.simSelectProduct(slotCode, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/insert-money")
    public ResponseEntity<?> simInsertMoney(@RequestBody Map<String, Object> body) {
        try {
            int denom = ((Number) body.get("denomination")).intValue();
            int step = ((Number) body.getOrDefault("stepNumber", 3)).intValue();
            return ResponseEntity.ok(service.simInsertMoney(denom, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/dispense")
    public ResponseEntity<?> simDispense(@RequestBody(required = false) Map<String, Object> body) {
        try {
            int step = body != null && body.containsKey("stepNumber") ? ((Number) body.get("stepNumber")).intValue() : 5;
            return ResponseEntity.ok(service.simDispense(step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/cancel")
    public ResponseEntity<?> simCancel(@RequestBody(required = false) Map<String, Object> body) {
        try {
            int step = body != null && body.containsKey("stepNumber") ? ((Number) body.get("stepNumber")).intValue() : 8;
            return ResponseEntity.ok(service.simCancel(step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/restock")
    public ResponseEntity<?> simRestock(@RequestBody Map<String, Object> body) {
        try {
            String slotCode = (String) body.get("slotCode");
            int qty = ((Number) body.getOrDefault("quantity", 5)).intValue();
            int step = ((Number) body.getOrDefault("stepNumber", 7)).intValue();
            return ResponseEntity.ok(service.simRestock(slotCode, qty, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "snapshot", service.getSimSnapshot()));
        }
    }

    @GetMapping("/sim/events")
    public ResponseEntity<?> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @GetMapping("/sim/snapshot")
    public ResponseEntity<?> simGetSnapshot() {
        return ResponseEntity.ok(service.getSimSnapshot());
    }
}

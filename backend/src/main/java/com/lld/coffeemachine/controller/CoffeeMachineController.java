package com.lld.coffeemachine.controller;

import com.lld.config.ErrorResponse;

import com.lld.coffeemachine.exception.*;
import com.lld.coffeemachine.factory.CoffeeRecipe;
import com.lld.coffeemachine.model.*;
import com.lld.coffeemachine.service.CoffeeMachineService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/coffeemachine", "/api/coffee-machine"})
@CrossOrigin(origins = "*")
public class CoffeeMachineController {
    private final CoffeeMachineService service;

    public CoffeeMachineController(CoffeeMachineService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @GetMapping("/menu")
    public ResponseEntity<List<CoffeeRecipe>> getMenu() {
        return ResponseEntity.ok(service.getMenu());
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(service.getStatus());
    }

    @GetMapping("/inventory")
    public ResponseEntity<Map<String, Object>> getInventory() {
        return ResponseEntity.ok(service.getInventoryDetails());
    }

    @GetMapping("/orders")
    public ResponseEntity<List<CoffeeOrder>> getOrders() {
        return ResponseEntity.ok(service.getOrders());
    }

    @PostMapping({"/order", "/select"})
    public ResponseEntity<?> startOrder(@RequestBody Map<String, Object> body) {
        try {
            String typeStr = (String) body.get("coffeeType");
            if (typeStr == null && body.containsKey("type")) {
                typeStr = (String) body.get("type");
            }
            if (typeStr == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "coffeeType is required"));
            }
            CoffeeType type = CoffeeType.valueOf(typeStr.trim().toUpperCase());
            return ResponseEntity.ok(service.startOrder(type));
        } catch (InsufficientIngredientException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(e));
        } catch (InvalidCoffeeTypeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(e));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/customize")
    public ResponseEntity<?> addCustomization(@RequestBody Map<String, Object> body) {
        try {
            String customization = (String) body.get("customization");
            if (customization == null && body.containsKey("addOn")) {
                customization = (String) body.get("addOn");
            }
            if (customization == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "customization is required"));
            }
            return ResponseEntity.ok(service.addCustomization(customization));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping({"/payment", "/insert-payment"})
    public ResponseEntity<?> insertPayment(@RequestBody Map<String, Object> body) {
        try {
            double amount = ((Number) body.get("amount")).doubleValue();
            return ResponseEntity.ok(service.insertPayment(amount));
        } catch (InsufficientIngredientException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(e));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/brew")
    public ResponseEntity<?> brew() {
        try {
            return ResponseEntity.ok(service.brew());
        } catch (InsufficientPaymentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(e));
        } catch (InsufficientIngredientException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(e));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/collect")
    public ResponseEntity<?> collectCoffee() {
        try {
            return ResponseEntity.ok(service.collectCoffee());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancelOrder() {
        try {
            return ResponseEntity.ok(service.cancelOrder());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/refill")
    public ResponseEntity<?> refillIngredient(@RequestBody Map<String, Object> body) {
        try {
            String ingStr = (String) body.get("ingredient");
            int amount = ((Number) body.get("amount")).intValue();
            IngredientType type = IngredientType.valueOf(ingStr.trim().toUpperCase());
            service.refillIngredient(type, amount);
            return ResponseEntity.ok(Map.of("message", type + " refilled by " + amount, "inventory", service.getInventoryDetails()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
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
    public ResponseEntity<?> simSelectBase(@RequestBody Map<String, Object> body) {
        try {
            String typeStr = (String) body.get("coffeeType");
            int step = ((Number) body.getOrDefault("step", 2)).intValue();
            CoffeeType type = CoffeeType.valueOf(typeStr.trim().toUpperCase());
            return ResponseEntity.ok(service.simSelectBase(type, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/customize")
    public ResponseEntity<?> simAddCustomization(@RequestBody Map<String, Object> body) {
        try {
            String addOn = (String) body.get("customization");
            int step = ((Number) body.getOrDefault("step", 3)).intValue();
            return ResponseEntity.ok(service.simAddCustomization(addOn, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/payment")
    public ResponseEntity<?> simInsertPayment(@RequestBody Map<String, Object> body) {
        try {
            double amount = ((Number) body.get("amount")).doubleValue();
            int step = ((Number) body.getOrDefault("step", 4)).intValue();
            return ResponseEntity.ok(service.simInsertPayment(amount, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/brew")
    public ResponseEntity<?> simBrew(@RequestBody(required = false) Map<String, Object> body) {
        try {
            int step = body != null && body.containsKey("step") ? ((Number) body.get("step")).intValue() : 5;
            return ResponseEntity.ok(service.simBrew(step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/collect")
    public ResponseEntity<?> simCollect(@RequestBody(required = false) Map<String, Object> body) {
        try {
            int step = body != null && body.containsKey("step") ? ((Number) body.get("step")).intValue() : 6;
            return ResponseEntity.ok(service.simCollect(step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/cancel")
    public ResponseEntity<?> simCancel(@RequestBody(required = false) Map<String, Object> body) {
        try {
            int step = body != null && body.containsKey("step") ? ((Number) body.get("step")).intValue() : 7;
            return ResponseEntity.ok(service.simCancel(step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/refill")
    public ResponseEntity<?> simRefill(@RequestBody Map<String, Object> body) {
        try {
            String ingStr = (String) body.get("ingredient");
            int amount = ((Number) body.get("amount")).intValue();
            int step = ((Number) body.getOrDefault("step", 7)).intValue();
            IngredientType type = IngredientType.valueOf(ingStr.trim().toUpperCase());
            return ResponseEntity.ok(service.simRefill(type, amount, step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
        }
    }

    @PostMapping("/sim/race")
    public ResponseEntity<?> simRace(@RequestBody(required = false) Map<String, Object> body) {
        try {
            int step = body != null && body.containsKey("step") ? ((Number) body.get("step")).intValue() : 8;
            return ResponseEntity.ok(service.simSimulateRace(step));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", ErrorResponse.messageOf(e), "snapshot", service.getSimSnapshot()));
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
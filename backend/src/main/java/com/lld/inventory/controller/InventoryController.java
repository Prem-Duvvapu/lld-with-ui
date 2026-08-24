package com.lld.inventory.controller;

import com.lld.inventory.exception.InvalidStockOperationException;
import com.lld.inventory.model.InventoryEvent;
import com.lld.inventory.model.Product;
import com.lld.inventory.model.StockAlert;
import com.lld.inventory.model.StockMovement;
import com.lld.inventory.model.Supplier;
import com.lld.inventory.service.InventoryService;
import com.lld.inventory.strategy.ReorderPolicy;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // ------------------------------------------------------------- live API

    @PostMapping("/products")
    public Product addProduct(@RequestBody Product product) {
        return inventoryService.addProduct(product);
    }

    @GetMapping("/products")
    public List<Product> getProducts(@RequestParam(required = false) String category) {
        return inventoryService.getProducts(category);
    }

    @PostMapping("/products/{productId}/stock")
    public StockMovement updateStock(@PathVariable long productId, @RequestBody Map<String, Object> request) {
        int quantity = ((Number) request.get("quantity")).intValue();
        String type = (String) request.get("type");
        String reason = (String) request.getOrDefault("reason", "");
        return inventoryService.updateStock(productId, quantity, type, reason);
    }

    @GetMapping("/products/low-stock")
    public List<Product> getLowStockItems(@RequestParam(defaultValue = "10") int threshold) {
        return inventoryService.getLowStockItems(threshold);
    }

    @PostMapping("/products/{productId}/reorder")
    public StockMovement reorder(@PathVariable long productId,
                                 @RequestParam(defaultValue = "EOQ") String policy) {
        return inventoryService.reorder(productId, parsePolicy(policy));
    }

    @PostMapping("/products/{productId}/transfer")
    public StockMovement transferStock(@PathVariable long productId, @RequestBody Map<String, String> request) {
        int quantity = Integer.parseInt(request.get("quantity"));
        String fromLocation = request.get("fromLocation");
        String toLocation = request.get("toLocation");
        return inventoryService.transferStock(productId, fromLocation, toLocation, quantity);
    }

    @GetMapping("/products/{productId}/movements")
    public List<StockMovement> getStockMovements(@PathVariable long productId) {
        return inventoryService.getStockMovements(productId);
    }

    @GetMapping("/suppliers")
    public List<Supplier> getSuppliers() {
        return inventoryService.getSuppliers();
    }

    /** Live feed of stock alerts produced by the observer package. */
    @GetMapping("/alerts")
    public List<StockAlert> getAlerts() {
        return inventoryService.getAlerts();
    }

    @GetMapping("/events")
    public List<InventoryEvent> getEvents() {
        return inventoryService.getEvents();
    }

    // ------------------------------------------------------------- sim API

    @PostMapping("/sim/reset")
    public Map<String, String> simReset() {
        inventoryService.simReset();
        return Map.of("status", "reset");
    }

    @GetMapping("/sim/state")
    public Map<String, Object> simState() {
        return inventoryService.simState();
    }

    @PostMapping("/sim/sell")
    public StockMovement simSell(@RequestBody Map<String, Object> body) {
        return inventoryService.simSell(productId(body), intOf(body.get("quantity")));
    }

    @PostMapping("/sim/restock")
    public StockMovement simRestock(@RequestBody Map<String, Object> body) {
        return inventoryService.simRestock(productId(body), intOf(body.get("quantity")));
    }

    @PostMapping("/sim/transfer")
    public StockMovement simTransfer(@RequestBody Map<String, Object> body) {
        return inventoryService.simTransfer(productId(body), intOf(body.get("quantity")));
    }

    @PostMapping("/sim/reorder")
    public StockMovement simReorder(@RequestBody Map<String, Object> body) {
        String policy = body.getOrDefault("policy", "EOQ").toString();
        return inventoryService.simReorder(productId(body), parsePolicy(policy));
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) {
        int buyers = body.get("buyers") == null ? 8 : ((Number) body.get("buyers")).intValue();
        return inventoryService.simRace(productId(body), buyers);
    }

    @GetMapping("/sim/alerts")
    public List<StockAlert> simAlerts() {
        return inventoryService.simAlerts();
    }

    @GetMapping("/sim/events")
    public List<InventoryEvent> simEvents() {
        return inventoryService.simEvents();
    }

    // ------------------------------------------------------------ helpers

    private static long productId(Map<String, Object> body) {
        Object id = body.get("productId");
        if (id == null) {
            throw new InvalidStockOperationException("productId is required");
        }
        return ((Number) id).longValue();
    }

    private static int intOf(Object value) {
        if (!(value instanceof Number n)) {
            throw new InvalidStockOperationException("A numeric value is required");
        }
        return n.intValue();
    }

    private static ReorderPolicy parsePolicy(String policy) {
        if (policy == null || policy.isBlank()) {
            throw new InvalidStockOperationException("Reorder policy is required");
        }
        try {
            return ReorderPolicy.valueOf(policy.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidStockOperationException("Unknown reorder policy: " + policy
                    + " (valid: MIN_RESTOCK, EOQ, URGENT_BUFFER)");
        }
    }
}

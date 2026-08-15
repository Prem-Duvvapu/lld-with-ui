package com.lld.inventory.controller;

import com.lld.inventory.model.Product;
import com.lld.inventory.model.StockMovement;
import com.lld.inventory.model.Supplier;
import com.lld.inventory.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/products")
    public ResponseEntity<Product> addProduct(@RequestBody Product product) {
        return ResponseEntity.ok(inventoryService.addProduct(product));
    }

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(inventoryService.getProducts(category));
    }

    @PostMapping("/products/{productId}/stock")
    public ResponseEntity<?> updateStock(@PathVariable long productId, @RequestBody Map<String, Object> request) {
        try {
            int quantity = ((Number) request.get("quantity")).intValue();
            String type = (String) request.get("type");
            String reason = (String) request.getOrDefault("reason", "");
            StockMovement movement = inventoryService.updateStock(productId, quantity, type, reason);
            return ResponseEntity.ok(movement);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/products/low-stock")
    public ResponseEntity<List<Product>> getLowStockItems(@RequestParam(defaultValue = "10") int threshold) {
        return ResponseEntity.ok(inventoryService.getLowStockItems(threshold));
    }

    @PostMapping("/products/{productId}/transfer")
    public ResponseEntity<?> transferStock(@PathVariable long productId, @RequestBody Map<String, String> request) {
        try {
            int quantity = Integer.parseInt(request.get("quantity"));
            String fromLocation = request.get("fromLocation");
            String toLocation = request.get("toLocation");
            StockMovement movement = inventoryService.transferStock(productId, fromLocation, toLocation, quantity);
            return ResponseEntity.ok(movement);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/products/{productId}/movements")
    public ResponseEntity<List<StockMovement>> getStockMovements(@PathVariable long productId) {
        return ResponseEntity.ok(inventoryService.getStockMovements(productId));
    }

    @GetMapping("/suppliers")
    public ResponseEntity<List<Supplier>> getSuppliers() {
        return ResponseEntity.ok(inventoryService.getSuppliers());
    }
}
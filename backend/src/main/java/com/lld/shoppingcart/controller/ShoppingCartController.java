package com.lld.shoppingcart.controller;

import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.service.ShoppingCartService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shopping-cart")
@CrossOrigin(origins = "*")
public class ShoppingCartController {
    private final ShoppingCartService shoppingCartService;

    public ShoppingCartController(ShoppingCartService shoppingCartService) {
        this.shoppingCartService = shoppingCartService;
    }

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts() {
        return ResponseEntity.ok(shoppingCartService.getProducts());
    }

    @PostMapping("/cart/add")
    public ResponseEntity<?> addToCart(@RequestBody Map<String, Object> request) {
        try {
            long cartId = ((Number) request.getOrDefault("cartId", 0)).longValue();
            String userId = (String) request.get("userId");
            long productId = ((Number) request.get("productId")).longValue();
            int quantity = ((Number) request.get("quantity")).intValue();
            Cart cart = shoppingCartService.addToCart(cartId, userId, productId, quantity);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cart/{cartId}/remove")
    public ResponseEntity<?> removeFromCart(@PathVariable long cartId, @RequestBody Map<String, Object> request) {
        try {
            long productId = ((Number) request.get("productId")).longValue();
            Cart cart = shoppingCartService.removeFromCart(cartId, productId);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cart/{cartId}/update")
    public ResponseEntity<?> updateQuantity(@PathVariable long cartId, @RequestBody Map<String, Object> request) {
        try {
            long productId = ((Number) request.get("productId")).longValue();
            int quantity = ((Number) request.get("quantity")).intValue();
            Cart cart = shoppingCartService.updateQuantity(cartId, productId, quantity);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/cart/{cartId}")
    public ResponseEntity<?> getCart(@PathVariable long cartId) {
        try {
            return ResponseEntity.ok(shoppingCartService.getCart(cartId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cart/{cartId}/checkout")
    public ResponseEntity<?> checkout(@PathVariable long cartId, @RequestBody Map<String, String> request) {
        try {
            String shippingAddress = request.get("shippingAddress");
            Order order = shoppingCartService.checkout(cartId, shippingAddress);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable long orderId, @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            Order order = shoppingCartService.updateOrderStatus(orderId, status);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getOrders() {
        return ResponseEntity.ok(shoppingCartService.getOrders());
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable long orderId) {
        try {
            return ResponseEntity.ok(shoppingCartService.getOrder(orderId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
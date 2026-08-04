package com.lld.zomato.controller;

import com.lld.zomato.model.*;
import com.lld.zomato.service.ZomatoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/zomato")
@CrossOrigin(origins = "*")
public class ZomatoController {

    private final ZomatoService zomatoService;

    public ZomatoController(ZomatoService zomatoService) {
        this.zomatoService = zomatoService;
    }

    // --- Customers ---
    @GetMapping("/customers")
    public ResponseEntity<List<Customer>> getCustomers() {
        return ResponseEntity.ok(zomatoService.getCustomers());
    }

    @PostMapping("/customers")
    public ResponseEntity<Customer> registerCustomer(@RequestBody Customer customer) {
        return ResponseEntity.ok(zomatoService.registerCustomer(
                customer.getName(), customer.getEmail(), customer.getPhone(), customer.getDeliveryAddress()
        ));
    }

    // --- Restaurants ---
    @GetMapping("/restaurants")
    public ResponseEntity<List<Restaurant>> getRestaurants() {
        return ResponseEntity.ok(zomatoService.getRestaurants());
    }

    @GetMapping("/restaurants/{id}")
    public ResponseEntity<Restaurant> getRestaurant(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.getRestaurant(id));
    }

    @PutMapping("/restaurants/{id}/menu/{itemId}/availability")
    public ResponseEntity<Restaurant> updateMenuItemAvailability(
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestBody Map<String, Boolean> body) {
        boolean available = body.getOrDefault("available", true);
        return ResponseEntity.ok(zomatoService.updateMenuItemAvailability(id, itemId, available));
    }

    @PostMapping("/restaurants/{id}/menu")
    public ResponseEntity<Restaurant> addMenuItem(
            @PathVariable String id,
            @RequestBody MenuItem menuItem) {
        return ResponseEntity.ok(zomatoService.addMenuItemToRestaurant(id, menuItem));
    }

    // --- Delivery Agents ---
    @GetMapping("/agents")
    public ResponseEntity<List<DeliveryAgent>> getDeliveryAgents() {
        return ResponseEntity.ok(zomatoService.getDeliveryAgents());
    }

    @PutMapping("/agents/{id}/availability")
    public ResponseEntity<DeliveryAgent> toggleAgentAvailability(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body) {
        boolean available = body.getOrDefault("available", true);
        return ResponseEntity.ok(zomatoService.toggleAgentAvailability(id, available));
    }

    // --- Orders ---
    public record PlaceOrderRequest(
            String customerId,
            String restaurantId,
            List<OrderItem> items,
            String deliveryAddress,
            String paymentMethod
    ) {}

    @PostMapping("/orders")
    public ResponseEntity<Order> placeOrder(@RequestBody PlaceOrderRequest request) {
        return ResponseEntity.ok(zomatoService.placeOrder(
                request.customerId(),
                request.restaurantId(),
                request.items(),
                request.deliveryAddress(),
                request.paymentMethod()
        ));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getOrders(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String restaurantId,
            @RequestParam(required = false) String agentId) {
        if (customerId != null) return ResponseEntity.ok(zomatoService.getCustomerOrders(customerId));
        if (restaurantId != null) return ResponseEntity.ok(zomatoService.getRestaurantOrders(restaurantId));
        if (agentId != null) return ResponseEntity.ok(zomatoService.getAgentOrders(agentId));
        return ResponseEntity.ok(zomatoService.getAllOrders());
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.getOrder(id));
    }

    @PutMapping("/orders/{id}/confirm")
    public ResponseEntity<Order> confirmOrder(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.confirmOrder(id));
    }

    @PutMapping("/orders/{id}/prepare")
    public ResponseEntity<Order> startPreparingOrder(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.startPreparingOrder(id));
    }

    @PutMapping("/orders/{id}/ready")
    public ResponseEntity<Order> markReadyForPickup(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.markReadyForPickup(id));
    }

    @PutMapping("/orders/{id}/verify-otp")
    public ResponseEntity<Order> verifyOtpAndDeliver(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String otp = body.get("otp");
        return ResponseEntity.ok(zomatoService.verifyOtpAndDeliver(id, otp));
    }

    @PutMapping("/orders/{id}/cancel")
    public ResponseEntity<Order> cancelOrder(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "User requested cancellation";
        return ResponseEntity.ok(zomatoService.cancelOrder(id, reason));
    }

    // --- Notifications ---
    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(required = false) String recipientId) {
        return ResponseEntity.ok(zomatoService.getNotifications(recipientId));
    }
}

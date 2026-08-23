package com.lld.zomato.controller;

import com.lld.zomato.model.*;
import com.lld.zomato.service.ZomatoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/zomato")
@CrossOrigin(origins = "*")
@Tag(name = "Zomato Food Delivery API", description = "Order management, delivery agent assignment, and simulation engine")
public class ZomatoController {

    private final ZomatoService zomatoService;

    public ZomatoController(ZomatoService zomatoService) {
        this.zomatoService = zomatoService;
    }

    // --- Customers ---
    @GetMapping("/customers")
    @Operation(summary = "Get all registered customers")
    public ResponseEntity<List<Customer>> getCustomers() {
        return ResponseEntity.ok(zomatoService.getCustomers());
    }

    @PostMapping("/customers")
    @Operation(summary = "Register a new customer")
    public ResponseEntity<Customer> registerCustomer(@RequestBody Customer customer) {
        return ResponseEntity.ok(zomatoService.registerCustomer(
                customer.getName(), customer.getEmail(), customer.getPhone(), customer.getDeliveryAddress()
        ));
    }

    // --- Restaurants ---
    @GetMapping("/restaurants")
    @Operation(summary = "Get all restaurants and their menus")
    public ResponseEntity<List<Restaurant>> getRestaurants() {
        return ResponseEntity.ok(zomatoService.getRestaurants());
    }

    @GetMapping("/restaurants/{id}")
    @Operation(summary = "Get a specific restaurant by ID")
    public ResponseEntity<Restaurant> getRestaurant(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.getRestaurant(id));
    }

    @PutMapping("/restaurants/{id}/menu/{itemId}/availability")
    @Operation(summary = "Update availability of a menu item")
    public ResponseEntity<Restaurant> updateMenuItemAvailability(
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestBody Map<String, Boolean> body) {
        boolean available = body.getOrDefault("available", true);
        return ResponseEntity.ok(zomatoService.updateMenuItemAvailability(id, itemId, available));
    }

    @PostMapping("/restaurants/{id}/menu")
    @Operation(summary = "Add a menu item to a restaurant")
    public ResponseEntity<Restaurant> addMenuItem(
            @PathVariable String id,
            @RequestBody MenuItem menuItem) {
        return ResponseEntity.ok(zomatoService.addMenuItemToRestaurant(id, menuItem));
    }

    // --- Delivery Agents ---
    @GetMapping("/agents")
    @Operation(summary = "Get all delivery agents")
    public ResponseEntity<List<DeliveryAgent>> getDeliveryAgents() {
        return ResponseEntity.ok(zomatoService.getDeliveryAgents());
    }

    @PutMapping("/agents/{id}/availability")
    @Operation(summary = "Toggle availability of a delivery agent")
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
    @Operation(summary = "Place a new order")
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
    @Operation(summary = "Get all orders or filter by customer/restaurant/agent")
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
    @Operation(summary = "Get an order by ID")
    public ResponseEntity<Order> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.getOrder(id));
    }

    @PutMapping("/orders/{id}/confirm")
    @Operation(summary = "Confirm an order")
    public ResponseEntity<Order> confirmOrder(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.confirmOrder(id));
    }

    @PutMapping("/orders/{id}/prepare")
    @Operation(summary = "Start preparing an order")
    public ResponseEntity<Order> startPreparingOrder(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.startPreparingOrder(id));
    }

    @PutMapping("/orders/{id}/ready")
    @Operation(summary = "Mark order ready for pickup and assign agent")
    public ResponseEntity<Order> markReadyForPickup(@PathVariable String id) {
        return ResponseEntity.ok(zomatoService.markReadyForPickup(id));
    }

    @PutMapping("/orders/{id}/verify-otp")
    @Operation(summary = "Verify delivery OTP and deliver order")
    public ResponseEntity<Order> verifyOtpAndDeliver(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String otp = body.get("otp");
        return ResponseEntity.ok(zomatoService.verifyOtpAndDeliver(id, otp));
    }

    @PutMapping("/orders/{id}/cancel")
    @Operation(summary = "Cancel an order")
    public ResponseEntity<Order> cancelOrder(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "User requested cancellation";
        return ResponseEntity.ok(zomatoService.cancelOrder(id, reason));
    }

    // --- Notifications ---
    @GetMapping("/notifications")
    @Operation(summary = "Get notifications for a recipient")
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(required = false) String recipientId) {
        return ResponseEntity.ok(zomatoService.getNotifications(recipientId));
    }

    // ==========================================
    // Simulation Sandbox Endpoints (/sim/*)
    // ==========================================

    @PostMapping("/sim/reset")
    @Operation(summary = "Reset simulation sandbox state")
    public ResponseEntity<Map<String, String>> simReset() {
        zomatoService.simReset();
        return ResponseEntity.ok(Map.of("status", "RESET_COMPLETE"));
    }

    @GetMapping("/sim/state")
    @Operation(summary = "Get current simulation state snapshot")
    public ResponseEntity<Map<String, Object>> simState() {
        return ResponseEntity.ok(zomatoService.simState());
    }

    @PostMapping("/sim/order")
    @Operation(summary = "Simulate placing food order")
    public ResponseEntity<Order> simOrder(@RequestBody(required = false) Map<String, Object> body) {
        String customerId = body != null ? (String) body.get("customerId") : "CUST-101";
        String restaurantId = body != null ? (String) body.get("restaurantId") : "REST-01";
        String deliveryAddress = body != null ? (String) body.get("deliveryAddress") : null;
        String paymentMethod = body != null ? (String) body.get("paymentMethod") : "UPI";

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> itemsRaw = body != null ? (List<Map<String, Object>>) body.get("items") : null;
        List<OrderItem> items = itemsRaw != null ? itemsRaw.stream()
                .map(m -> new OrderItem(
                        (String) m.get("itemId"),
                        (String) m.get("name"),
                        Double.parseDouble(String.valueOf(m.getOrDefault("price", 100.0))),
                        Integer.parseInt(String.valueOf(m.getOrDefault("quantity", 1)))
                ))
                .toList() : List.of();

        return ResponseEntity.ok(zomatoService.simOrder(customerId, restaurantId, items, deliveryAddress, paymentMethod));
    }

    @PostMapping("/sim/confirm")
    @Operation(summary = "Simulate restaurant confirming order")
    public ResponseEntity<Order> simConfirm(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(zomatoService.simConfirm(orderId));
    }

    @PostMapping("/sim/prepare")
    @Operation(summary = "Simulate kitchen preparing order")
    public ResponseEntity<Order> simPrepare(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(zomatoService.simPrepare(orderId));
    }

    @PostMapping("/sim/ready")
    @Operation(summary = "Simulate marking order ready and assigning agent")
    public ResponseEntity<Order> simReady(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(zomatoService.simReady(orderId));
    }

    @PostMapping("/sim/deliver")
    @Operation(summary = "Simulate delivering order with OTP")
    public ResponseEntity<Order> simDeliver(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        String otp = body.getOrDefault("otp", "1234");
        return ResponseEntity.ok(zomatoService.simDeliver(orderId, otp));
    }

    @PostMapping("/sim/cancel")
    @Operation(summary = "Simulate cancelling order")
    public ResponseEntity<Order> simCancel(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        String reason = body.getOrDefault("reason", "Customer cancelled in simulation");
        return ResponseEntity.ok(zomatoService.simCancel(orderId, reason));
    }

    @PostMapping("/sim/race")
    @Operation(summary = "Simulate concurrent orders competing for one delivery agent")
    public ResponseEntity<Map<String, Object>> simRace(@RequestBody(required = false) Map<String, Object> body) {
        String agentId = body != null ? (String) body.getOrDefault("agentId", "AGENT-201") : "AGENT-201";
        int orders = 5;
        if (body != null && body.get("orders") instanceof Number num) {
            orders = num.intValue();
        }
        return ResponseEntity.ok(zomatoService.simRace(agentId, orders));
    }

    @GetMapping("/sim/events")
    @Operation(summary = "Get simulation event audit log")
    public ResponseEntity<List<ZomatoEvent>> simEvents() {
        return ResponseEntity.ok(zomatoService.simEvents());
    }
}

package com.lld.shoppingcart.controller;

import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.service.ShoppingCartService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shoppingcart")
@CrossOrigin(origins = "*")
public class ShoppingCartController {

    private final ShoppingCartService service;

    public ShoppingCartController(ShoppingCartService service) {
        this.service = service;
    }

    @GetMapping("/products")
    public List<Product> getProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice) {
        return service.searchProducts(query, category, minPrice, maxPrice);
    }

    @GetMapping("/users")
    public List<User> getUsers() {
        return service.getAllUsers();
    }

    @GetMapping("/cart/{userId}")
    public Cart getCart(@PathVariable String userId) {
        return service.getCart(userId);
    }

    @PostMapping("/cart/{userId}/add")
    public Cart addToCart(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        String productId = body.get("productId").toString();
        int quantity = Integer.parseInt(body.get("quantity").toString());
        service.addToCart(userId, productId, quantity);
        return service.getCart(userId);
    }

    @PostMapping("/cart/{userId}/remove")
    public Cart removeFromCart(@PathVariable String userId, @RequestBody Map<String, String> body) {
        String productId = body.get("productId");
        service.removeFromCart(userId, productId);
        return service.getCart(userId);
    }

    @PostMapping("/cart/{userId}/update")
    public Cart updateCartQuantity(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        String productId = body.get("productId").toString();
        int quantity = Integer.parseInt(body.get("quantity").toString());
        service.updateCartQuantity(userId, productId, quantity);
        return service.getCart(userId);
    }

    @PostMapping("/cart/{userId}/undo")
    public Cart undoLastCartAction(@PathVariable String userId) {
        service.undoLastCartCommand(userId);
        return service.getCart(userId);
    }

    @PostMapping("/checkout")
    public Order placeOrder(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        PaymentMethod method = PaymentMethod.valueOf(body.getOrDefault("paymentMethod", "UPI"));
        String idempotencyKey = body.get("idempotencyKey");
        return service.placeOrder(userId, method, idempotencyKey);
    }

    @GetMapping("/orders/{orderId}")
    public Order getOrder(@PathVariable String orderId) {
        return service.getOrder(orderId);
    }

    @GetMapping("/orders/user/{userId}")
    public List<Order> getUserOrders(@PathVariable String userId) {
        return service.getUserOrders(userId);
    }

    @GetMapping("/orders")
    public List<Order> getAllOrders() {
        return service.getAllOrders();
    }

    @PostMapping("/orders/{orderId}/status")
    public Order updateOrderStatus(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        OrderStatus newStatus = OrderStatus.valueOf(body.get("status"));
        return service.updateOrderStatus(orderId, newStatus);
    }

    @PostMapping("/orders/{orderId}/cancel")
    public Order cancelOrder(@PathVariable String orderId) {
        service.cancelOrder(orderId);
        return service.getOrder(orderId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/add-to-cart")
    public Map<String, Object> simAddToCart(@RequestBody Map<String, Object> body) {
        String userId = body.get("userId").toString();
        String productId = body.get("productId").toString();
        int quantity = Integer.parseInt(body.get("quantity").toString());
        return service.simAddToCart(userId, productId, quantity);
    }

    @PostMapping("/sim/place-order")
    public Map<String, Object> simPlaceOrder(@RequestBody Map<String, Object> body) {
        String userId = body.get("userId").toString();
        PaymentMethod method = PaymentMethod.valueOf(body.getOrDefault("paymentMethod", "UPI").toString());
        return service.simPlaceOrder(userId, method);
    }

    @PostMapping("/sim/update-status")
    public Map<String, Object> simUpdateStatus(@RequestBody Map<String, Object> body) {
        String orderId = body.get("orderId").toString();
        OrderStatus status = OrderStatus.valueOf(body.get("status").toString());
        return service.simUpdateOrderStatus(orderId, status);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshots")
    public Map<String, Object> simGetSnapshots() {
        return service.getSimSnapshots();
    }
}
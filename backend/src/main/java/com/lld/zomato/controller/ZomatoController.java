package com.lld.zomato.controller;

import com.lld.zomato.model.MenuItem;
import com.lld.zomato.model.Order;
import com.lld.zomato.model.OrderItem;
import com.lld.zomato.model.Restaurant;
import com.lld.zomato.service.ZomatoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/zomato")
@CrossOrigin(origins = "*")
public class ZomatoController {

    private final ZomatoService service;

    public ZomatoController(ZomatoService service) {
        this.service = service;
    }

    @GetMapping("/restaurants")
    public List<Restaurant> getRestaurants() {
        return service.getRestaurants();
    }

    @GetMapping("/restaurants/{id}")
    public ResponseEntity<?> getRestaurant(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getRestaurant(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/restaurants/{id}/menu")
    public ResponseEntity<?> getMenu(@PathVariable String id) {
        try {
            List<MenuItem> menu = service.getRestaurant(id).getMenu();
            return ResponseEntity.ok(menu);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/orders")
    public ResponseEntity<?> placeOrder(@RequestBody Map<String, Object> request) {
        try {
            String restaurantId = (String) request.get("restaurantId");
            String userId = (String) request.get("userId");
            List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) request.get("items");

            List<OrderItem> items = itemsRaw.stream().map(m -> {
                String menuItemId = (String) m.get("menuItemId");
                String name = (String) m.get("name");
                int qty = ((Number) m.get("quantity")).intValue();
                double price = ((Number) m.get("price")).doubleValue();
                return new OrderItem(menuItemId, name, qty, price);
            }).toList();

            Order order = service.placeOrder(restaurantId, userId, items);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> getOrder(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getOrder(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/orders")
    public List<Order> getUserOrders(@RequestParam String userId) {
        return service.getUserOrders(userId);
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            return ResponseEntity.ok(service.updateOrderStatus(id, status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

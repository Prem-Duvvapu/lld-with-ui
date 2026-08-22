package com.lld.restaurant.controller;

import com.lld.restaurant.model.*;
import com.lld.restaurant.service.KitchenService;
import com.lld.restaurant.service.RestaurantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/restaurant")
@CrossOrigin(origins = "*")
@Tag(name = "Restaurant Management API", description = "Table allocation, order workflow, kitchen processing, billing strategies, and simulation sandbox")
public class RestaurantController {

    private final RestaurantService restaurantService;
    private final KitchenService kitchenService;

    public RestaurantController(RestaurantService restaurantService, KitchenService kitchenService) {
        this.restaurantService = restaurantService;
        this.kitchenService = kitchenService;
    }

    // ==========================================
    // Live Restaurant Endpoints
    // ==========================================

    @GetMapping("/tables")
    @Operation(summary = "Get all restaurant tables with current occupancy status")
    public ResponseEntity<List<RestaurantTable>> getTables() {
        return ResponseEntity.ok(restaurantService.getTables());
    }

    @GetMapping("/menu")
    @Operation(summary = "Get restaurant menu catalog items")
    public ResponseEntity<List<MenuItem>> getMenu() {
        return ResponseEntity.ok(restaurantService.getMenu());
    }

    @PostMapping("/tables/{tableId}/seat")
    @Operation(summary = "Seat guests at a specific table with concurrency control")
    public ResponseEntity<RestaurantTable> seatGuests(
            @PathVariable String tableId,
            @RequestBody Map<String, Object> body) {
        int partySize = Integer.parseInt(String.valueOf(body.getOrDefault("partySize", 1)));
        return ResponseEntity.ok(restaurantService.seatGuests(tableId, partySize));
    }

    @PostMapping("/orders")
    @Operation(summary = "Place a new food order for an occupied table")
    public ResponseEntity<Order> placeOrder(@RequestBody Map<String, Object> body) {
        String tableId = (String) body.get("tableId");
        String waiterName = (String) body.getOrDefault("waiterName", "Staff");
        String notes = (String) body.get("notes");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> linesRaw = (List<Map<String, Object>>) body.get("lines");
        List<OrderLineRequest> lines = linesRaw != null ? linesRaw.stream()
                .map(m -> new OrderLineRequest(
                        (String) m.get("menuItemId"),
                        Integer.parseInt(String.valueOf(m.getOrDefault("quantity", 1)))
                ))
                .toList() : List.of();

        return ResponseEntity.ok(restaurantService.placeOrder(tableId, waiterName, lines, notes));
    }

    @GetMapping("/orders")
    @Operation(summary = "Get all restaurant orders")
    public ResponseEntity<List<Order>> getOrders() {
        return ResponseEntity.ok(restaurantService.getOrders());
    }

    @GetMapping("/orders/{orderId}")
    @Operation(summary = "Get specific order details")
    public ResponseEntity<Order> getOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(restaurantService.getOrder(orderId));
    }

    @PostMapping("/orders/{orderId}/cancel")
    @Operation(summary = "Cancel an order in PLACED or PREPARING status")
    public ResponseEntity<Order> cancelOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(restaurantService.cancelOrder(orderId));
    }

    @GetMapping("/kitchen/pending")
    @Operation(summary = "Get orders waiting for preparation in the kitchen")
    public ResponseEntity<List<Order>> getPendingKitchenOrders() {
        return ResponseEntity.ok(kitchenService.pendingOrders());
    }

    @PostMapping("/kitchen/{orderId}/prepare")
    @Operation(summary = "Kitchen starts preparing order")
    public ResponseEntity<Order> startPreparation(@PathVariable String orderId) {
        return ResponseEntity.ok(kitchenService.startPreparation(orderId));
    }

    @PostMapping("/kitchen/{orderId}/ready")
    @Operation(summary = "Kitchen marks order as ready for pickup")
    public ResponseEntity<Order> markReady(@PathVariable String orderId) {
        return ResponseEntity.ok(kitchenService.markReady(orderId));
    }

    @PostMapping("/kitchen/{orderId}/serve")
    @Operation(summary = "Waiter marks order as served to table")
    public ResponseEntity<Order> markServed(@PathVariable String orderId) {
        return ResponseEntity.ok(kitchenService.markServed(orderId));
    }

    @PostMapping("/orders/{orderId}/bill")
    @Operation(summary = "Generate bill with dynamic strategy (Standard or Happy Hour)")
    public ResponseEntity<Bill> generateBill(@PathVariable String orderId) {
        return ResponseEntity.ok(restaurantService.generateBill(orderId));
    }

    @PostMapping("/bills/{billId}/pay")
    @Operation(summary = "Pay bill and release table back to AVAILABLE")
    public ResponseEntity<Payment> payBill(
            @PathVariable String billId,
            @RequestBody(required = false) Map<String, String> body) {
        String methodStr = body != null ? body.getOrDefault("method", "CASH") : "CASH";
        PaymentMethod method = PaymentMethod.valueOf(methodStr.toUpperCase());
        return ResponseEntity.ok(restaurantService.payBill(billId, method));
    }

    // ==========================================
    // Simulation Sandbox Endpoints (/sim/*)
    // ==========================================

    @PostMapping("/sim/reset")
    @Operation(summary = "Reset simulation sandbox state")
    public ResponseEntity<Map<String, String>> simReset() {
        restaurantService.simReset();
        return ResponseEntity.ok(Map.of("status", "RESET_COMPLETE"));
    }

    @GetMapping("/sim/state")
    @Operation(summary = "Get current simulation state snapshot")
    public ResponseEntity<Map<String, Object>> simState() {
        return ResponseEntity.ok(restaurantService.simState());
    }

    @PostMapping("/sim/seat")
    @Operation(summary = "Simulate seating guests at table")
    public ResponseEntity<RestaurantTable> simSeat(@RequestBody Map<String, Object> body) {
        String tableId = (String) body.getOrDefault("tableId", "T1");
        int partySize = Integer.parseInt(String.valueOf(body.getOrDefault("partySize", 2)));
        return ResponseEntity.ok(restaurantService.simSeat(tableId, partySize));
    }

    @PostMapping("/sim/order")
    @Operation(summary = "Simulate placing food order")
    public ResponseEntity<Order> simOrder(@RequestBody Map<String, Object> body) {
        String tableId = (String) body.getOrDefault("tableId", "T1");
        String waiterName = (String) body.getOrDefault("waiterName", "SimWaiter");
        String notes = (String) body.get("notes");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> linesRaw = (List<Map<String, Object>>) body.get("lines");
        List<OrderLineRequest> lines = linesRaw != null ? linesRaw.stream()
                .map(m -> new OrderLineRequest(
                        (String) m.get("menuItemId"),
                        Integer.parseInt(String.valueOf(m.getOrDefault("quantity", 1)))
                ))
                .toList() : List.of(new OrderLineRequest("M-001", 1), new OrderLineRequest("M-004", 1));

        return ResponseEntity.ok(restaurantService.simOrder(tableId, waiterName, lines, notes));
    }

    @PostMapping("/sim/prepare")
    @Operation(summary = "Simulate kitchen preparation")
    public ResponseEntity<Order> simPrepare(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(restaurantService.simPrepare(orderId));
    }

    @PostMapping("/sim/ready")
    @Operation(summary = "Simulate marking order ready")
    public ResponseEntity<Order> simReady(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(restaurantService.simReady(orderId));
    }

    @PostMapping("/sim/serve")
    @Operation(summary = "Simulate serving order")
    public ResponseEntity<Order> simServe(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(restaurantService.simServe(orderId));
    }

    @PostMapping("/sim/bill")
    @Operation(summary = "Simulate bill generation")
    public ResponseEntity<Bill> simBill(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(restaurantService.simBill(orderId));
    }

    @PostMapping("/sim/pay")
    @Operation(summary = "Simulate bill payment")
    public ResponseEntity<Payment> simPay(@RequestBody Map<String, String> body) {
        String billId = body.get("billId");
        String methodStr = body.getOrDefault("method", "CARD");
        PaymentMethod method = PaymentMethod.valueOf(methodStr.toUpperCase());
        return ResponseEntity.ok(restaurantService.simPay(billId, method));
    }

    @GetMapping("/sim/events")
    @Operation(summary = "Get simulation event audit log")
    public ResponseEntity<List<RestaurantEvent>> simEvents() {
        return ResponseEntity.ok(restaurantService.simEvents());
    }
}

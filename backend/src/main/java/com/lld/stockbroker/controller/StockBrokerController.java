package com.lld.stockbroker.controller;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.model.Account;
import com.lld.stockbroker.model.Order;
import com.lld.stockbroker.model.SimEvent;
import com.lld.stockbroker.model.Stock;
import com.lld.stockbroker.service.StockBrokerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stockbroker")
@CrossOrigin(origins = "*")
public class StockBrokerController {

    private final StockBrokerService stockBrokerService;

    public StockBrokerController(StockBrokerService stockBrokerService) {
        this.stockBrokerService = stockBrokerService;
    }

    // =========================================================================
    // STOCKS, ACCOUNTS & ORDER BOOK
    // =========================================================================

    @GetMapping("/stocks")
    public ResponseEntity<List<Stock>> getAllStocks() {
        return ResponseEntity.ok(stockBrokerService.getAllStocks());
    }

    @GetMapping("/stocks/{symbol}")
    public ResponseEntity<Stock> getStock(@PathVariable String symbol) {
        return ResponseEntity.ok(stockBrokerService.getStock(symbol));
    }

    @GetMapping("/orderbook/{symbol}")
    public ResponseEntity<Map<String, Object>> getOrderBookDepth(@PathVariable String symbol) {
        return ResponseEntity.ok(stockBrokerService.getOrderBook(symbol).getDepthSnapshot(15));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<Account> getAccount(@PathVariable String accountId) {
        return ResponseEntity.ok(stockBrokerService.getAccount(accountId));
    }

    @GetMapping("/accounts/{accountId}/orders")
    public ResponseEntity<List<Order>> getAccountOrders(@PathVariable String accountId) {
        return ResponseEntity.ok(stockBrokerService.getAccountOrders(accountId));
    }

    @GetMapping("/quotes")
    public ResponseEntity<List<Map<String, Object>>> getRecentQuotes() {
        return ResponseEntity.ok(stockBrokerService.getInAppPriceObserver().getRecentQuotes());
    }

    // =========================================================================
    // ORDER PLACEMENT & CANCELLATION
    // =========================================================================

    @PostMapping("/orders")
    public ResponseEntity<Order> placeOrder(@RequestBody Map<String, Object> body) {
        String accountId = (String) body.get("accountId");
        String symbol = (String) body.get("symbol");
        OrderSide side = OrderSide.valueOf(((String) body.get("side")).toUpperCase());
        OrderType type = OrderType.valueOf(((String) body.get("type")).toUpperCase());
        double price = body.get("price") != null ? Double.parseDouble(body.get("price").toString()) : 0.0;
        int quantity = Integer.parseInt(body.get("quantity").toString());

        Order order = stockBrokerService.placeOrder(accountId, symbol, side, type, price, quantity);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<Order> cancelOrder(@PathVariable String orderId) {
        Order cancelled = stockBrokerService.cancelOrder(orderId);
        return ResponseEntity.ok(cancelled);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        stockBrokerService.simReset();
        return ResponseEntity.ok(stockBrokerService.getSimSnapshots());
    }

    @PostMapping("/sim/order")
    public ResponseEntity<Map<String, Object>> simPlaceOrder(@RequestBody Map<String, Object> body) {
        String accountId = (String) body.getOrDefault("accountId", "SIM-ACC-ALPHA");
        String symbol = (String) body.getOrDefault("symbol", "INFY");
        OrderSide side = OrderSide.valueOf(((String) body.get("side")).toUpperCase());
        OrderType type = OrderType.valueOf(((String) body.get("type")).toUpperCase());
        double price = body.get("price") != null ? Double.parseDouble(body.get("price").toString()) : 0.0;
        int quantity = Integer.parseInt(body.get("quantity").toString());

        return ResponseEntity.ok(stockBrokerService.simPlaceOrder(accountId, symbol, side, type, price, quantity));
    }

    @PostMapping("/sim/cancel")
    public ResponseEntity<Map<String, Object>> simCancelOrder(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        return ResponseEntity.ok(stockBrokerService.simCancelOrder(orderId));
    }

    @GetMapping("/sim/snapshots")
    public ResponseEntity<Map<String, Object>> simGetSnapshots() {
        return ResponseEntity.ok(stockBrokerService.getSimSnapshots());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(stockBrokerService.getSimEvents());
    }
}

package com.lld.stockbroker.model;

import com.lld.stockbroker.enums.OrderSide;

import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;

public class OrderBook {
    private final String symbol;
    // Bids: Sorted descending by price (highest price first)
    private final NavigableMap<Double, Queue<Order>> bids = new TreeMap<>(Collections.reverseOrder());
    // Asks: Sorted ascending by price (lowest price first)
    private final NavigableMap<Double, Queue<Order>> asks = new TreeMap<>();
    private final List<Trade> tradeHistory = new CopyOnWriteArrayList<>();

    public OrderBook(String symbol) {
        this.symbol = symbol != null ? symbol.toUpperCase().trim() : "STOCK";
    }

    public String getSymbol() {
        return symbol;
    }

    public synchronized NavigableMap<Double, Queue<Order>> getBids() {
        return bids;
    }

    public synchronized NavigableMap<Double, Queue<Order>> getAsks() {
        return asks;
    }

    public List<Trade> getTradeHistory() {
        return Collections.unmodifiableList(tradeHistory);
    }

    public void recordTrade(Trade trade) {
        if (trade != null) {
            tradeHistory.add(0, trade); // Most recent first
        }
    }

    public synchronized void addRestingOrder(Order order) {
        if (order == null || order.getRemainingQuantity() <= 0) return;
        double price = order.getLimitPrice();
        if (order.getSide() == OrderSide.BUY) {
            bids.computeIfAbsent(price, k -> new ConcurrentLinkedQueue<>()).offer(order);
        } else {
            asks.computeIfAbsent(price, k -> new ConcurrentLinkedQueue<>()).offer(order);
        }
    }

    public synchronized boolean removeOrder(Order order) {
        if (order == null) return false;
        double price = order.getLimitPrice();
        NavigableMap<Double, Queue<Order>> bookSide = (order.getSide() == OrderSide.BUY) ? bids : asks;
        Queue<Order> queue = bookSide.get(price);
        if (queue != null) {
            boolean removed = queue.remove(order);
            if (queue.isEmpty()) {
                bookSide.remove(price);
            }
            return removed;
        }
        return false;
    }

    public synchronized Map<String, Object> getDepthSnapshot(int maxLevels) {
        Map<String, Object> depth = new HashMap<>();
        depth.put("symbol", symbol);

        List<Map<String, Object>> bidLevels = new ArrayList<>();
        int bCount = 0;
        int cumBidQty = 0;
        for (Map.Entry<Double, Queue<Order>> entry : bids.entrySet()) {
            if (bCount++ >= maxLevels) break;
            int levelQty = entry.getValue().stream().mapToInt(Order::getRemainingQuantity).sum();
            if (levelQty > 0) {
                cumBidQty += levelQty;
                bidLevels.add(Map.of(
                        "price", entry.getKey(),
                        "quantity", levelQty,
                        "orderCount", entry.getValue().size(),
                        "cumulative", cumBidQty
                ));
            }
        }

        List<Map<String, Object>> askLevels = new ArrayList<>();
        int aCount = 0;
        int cumAskQty = 0;
        for (Map.Entry<Double, Queue<Order>> entry : asks.entrySet()) {
            if (aCount++ >= maxLevels) break;
            int levelQty = entry.getValue().stream().mapToInt(Order::getRemainingQuantity).sum();
            if (levelQty > 0) {
                cumAskQty += levelQty;
                askLevels.add(Map.of(
                        "price", entry.getKey(),
                        "quantity", levelQty,
                        "orderCount", entry.getValue().size(),
                        "cumulative", cumAskQty
                ));
            }
        }

        depth.put("bids", bidLevels);
        depth.put("asks", askLevels);
        depth.put("spread", calculateSpread());
        return depth;
    }

    public synchronized double calculateSpread() {
        if (bids.isEmpty() || asks.isEmpty()) return 0.0;
        Double highestBid = bids.firstKey();
        Double lowestAsk = asks.firstKey();
        return Math.max(0.0, lowestAsk - highestBid);
    }
}

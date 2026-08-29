package com.lld.stockbroker.model;

import com.lld.stockbroker.exception.InsufficientStockException;
import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * An account's stock holdings. Mutations delegate to the per-symbol {@link Holding}, whose own
 * `synchronized` methods are the real concurrency boundary — Portfolio itself only owns the
 * {@code ConcurrentHashMap} routing requests to the right holding.
 */
@Getter
@Builder
public class Portfolio {
    private final String accountId;
    @Builder.Default
    private final Map<String, Holding> holdings = new ConcurrentHashMap<>();

    public static Portfolio empty(String accountId) {
        return Portfolio.builder().accountId(accountId).build();
    }

    public List<Holding> getAllHoldings() {
        return new ArrayList<>(holdings.values());
    }

    public Holding getHolding(String symbol) {
        return holdings.get(symbol);
    }

    public int getAvailableQuantity(String symbol) {
        Holding h = holdings.get(symbol);
        return h != null ? h.getAvailableQuantity() : 0;
    }

    public void reserveShares(String symbol, int qty) {
        Holding h = holdings.get(symbol);
        if (h == null) {
            throw new InsufficientStockException("No holdings found for " + symbol);
        }
        h.reserveShares(qty);
    }

    public void releaseReservedShares(String symbol, int qty) {
        Holding h = holdings.get(symbol);
        if (h != null) {
            h.releaseReservedShares(qty);
        }
    }

    public void executeSell(String symbol, int qty) {
        Holding h = holdings.get(symbol);
        if (h != null) {
            h.deductShares(qty);
        }
    }

    public void executeBuy(String symbol, int qty, double price) {
        Holding h = holdings.computeIfAbsent(symbol, s -> Holding.of(s, 0, price));
        h.addShares(qty, price);
    }

    public void addInitialHolding(String symbol, int qty, double avgPrice) {
        holdings.put(symbol, Holding.of(symbol, qty, avgPrice));
    }
}

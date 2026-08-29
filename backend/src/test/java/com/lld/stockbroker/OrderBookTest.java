package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.factory.OrderFactory;
import com.lld.stockbroker.model.Order;
import com.lld.stockbroker.model.OrderBook;
import com.lld.stockbroker.model.Trade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * {@link OrderBook} is this module's real independent-behaviour store — the price-time priority
 * ladder, depth-snapshot aggregation and spread calculation live entirely on it, not merely
 * wrapped id/save/get plumbing — so it earns its own test class the way
 * {@code AirlineRepositoryTest}/{@code ConcertTicketRepositoryTest} do for their modules.
 */
@DisplayName("OrderBook — price-time priority ladder")
class OrderBookTest {

    private OrderBook book;

    @BeforeEach
    void setUp() {
        book = new OrderBook("INFY");
    }

    private Order limitOrder(String id, String accountId, OrderSide side, double price, int qty) {
        return OrderFactory.createOrder(id, accountId, "INFY", side, OrderType.LIMIT, price, qty);
    }

    @Test
    @DisplayName("bids are sorted highest price first, asks lowest price first")
    void priceOrdering() {
        book.addRestingOrder(limitOrder("B1", "acc-1", OrderSide.BUY, 100.0, 10));
        book.addRestingOrder(limitOrder("B2", "acc-1", OrderSide.BUY, 105.0, 10));
        book.addRestingOrder(limitOrder("B3", "acc-1", OrderSide.BUY, 95.0, 10));

        book.addRestingOrder(limitOrder("A1", "acc-2", OrderSide.SELL, 120.0, 10));
        book.addRestingOrder(limitOrder("A2", "acc-2", OrderSide.SELL, 110.0, 10));
        book.addRestingOrder(limitOrder("A3", "acc-2", OrderSide.SELL, 115.0, 10));

        assertEquals(105.0, book.getBids().firstKey(), "best (highest) bid comes first");
        assertEquals(110.0, book.getAsks().firstKey(), "best (lowest) ask comes first");
    }

    @Test
    @DisplayName("removeOrder drops an empty price level entirely, not just the order")
    void removeOrderDropsEmptyLevel() {
        Order order = limitOrder("B1", "acc-1", OrderSide.BUY, 100.0, 10);
        book.addRestingOrder(order);
        assertTrue(book.getBids().containsKey(100.0));

        assertTrue(book.removeOrder(order));
        assertFalse(book.getBids().containsKey(100.0), "the whole price level disappears once its last order is removed");
        assertFalse(book.removeOrder(order), "removing an already-removed order is a no-op, not an error");
    }

    @Test
    @DisplayName("getDepthSnapshot aggregates quantity and cumulative volume per price level")
    void depthSnapshotAggregation() {
        book.addRestingOrder(limitOrder("B1", "acc-1", OrderSide.BUY, 100.0, 10));
        book.addRestingOrder(limitOrder("B2", "acc-2", OrderSide.BUY, 100.0, 5)); // same level, two orders
        book.addRestingOrder(limitOrder("B3", "acc-1", OrderSide.BUY, 99.0, 20));

        Map<String, Object> depth = book.getDepthSnapshot(10);
        @SuppressWarnings("unchecked")
        var bidLevels = (java.util.List<Map<String, Object>>) depth.get("bids");

        assertEquals(2, bidLevels.size());
        assertEquals(100.0, bidLevels.get(0).get("price"));
        assertEquals(15, bidLevels.get(0).get("quantity"), "two orders at the same price level sum their quantity");
        assertEquals(2, bidLevels.get(0).get("orderCount"));
        assertEquals(15, bidLevels.get(0).get("cumulative"));
        assertEquals(35, bidLevels.get(1).get("cumulative"), "cumulative volume carries down the ladder");
    }

    @Test
    @DisplayName("getDepthSnapshot respects maxLevels")
    void depthSnapshotRespectsMaxLevels() {
        for (int i = 0; i < 5; i++) {
            book.addRestingOrder(limitOrder("B" + i, "acc-1", OrderSide.BUY, 100.0 - i, 10));
        }
        Map<String, Object> depth = book.getDepthSnapshot(2);
        @SuppressWarnings("unchecked")
        var bidLevels = (java.util.List<Map<String, Object>>) depth.get("bids");
        assertEquals(2, bidLevels.size());
    }

    @Test
    @DisplayName("calculateSpread is best-ask minus best-bid, zero when either side is empty")
    void spreadCalculation() {
        assertEquals(0.0, book.calculateSpread(), "empty book has no spread");

        book.addRestingOrder(limitOrder("B1", "acc-1", OrderSide.BUY, 100.0, 10));
        assertEquals(0.0, book.calculateSpread(), "one-sided book still reports zero, not negative/NaN");

        book.addRestingOrder(limitOrder("A1", "acc-2", OrderSide.SELL, 103.0, 10));
        assertEquals(3.0, book.calculateSpread(), 0.001);
    }

    @Test
    @DisplayName("recordTrade prepends to trade history, most recent first")
    void tradeHistoryOrdering() {
        Trade t1 = Trade.builder().tradeId("T1").symbol("INFY").buyOrderId("B1").sellOrderId("A1")
                .buyerAccountId("acc-1").sellerAccountId("acc-2").price(100.0).quantity(5).build();
        Trade t2 = Trade.builder().tradeId("T2").symbol("INFY").buyOrderId("B2").sellOrderId("A2")
                .buyerAccountId("acc-1").sellerAccountId("acc-2").price(101.0).quantity(3).build();

        book.recordTrade(t1);
        book.recordTrade(t2);

        assertEquals("T2", book.getTradeHistory().get(0).getTradeId(), "most recent trade first");
        assertEquals("T1", book.getTradeHistory().get(1).getTradeId());
    }
}

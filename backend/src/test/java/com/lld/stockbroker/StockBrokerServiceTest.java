package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.InsufficientFundsException;
import com.lld.stockbroker.exception.InsufficientStockException;
import com.lld.stockbroker.exception.OrderExecutionException;
import com.lld.stockbroker.model.Account;
import com.lld.stockbroker.model.Order;
import com.lld.stockbroker.model.OrderBook;
import com.lld.stockbroker.model.Stock;
import com.lld.stockbroker.observer.InAppPriceObserver;
import com.lld.stockbroker.observer.LoggingPriceObserver;
import com.lld.stockbroker.service.StockBrokerService;
import com.lld.stockbroker.strategy.LimitExecutionStrategy;
import com.lld.stockbroker.strategy.MarketExecutionStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class StockBrokerServiceTest {

    private StockBrokerService service;

    @BeforeEach
    void setUp() {
        MarketExecutionStrategy marketStrategy = new MarketExecutionStrategy();
        LimitExecutionStrategy limitStrategy = new LimitExecutionStrategy();
        InAppPriceObserver inAppObserver = new InAppPriceObserver();
        LoggingPriceObserver loggingObserver = new LoggingPriceObserver();
        service = new StockBrokerService(marketStrategy, limitStrategy, inAppObserver, loggingObserver);
    }

    @Test
    void testStockRegistrationAndAccountCreation() {
        List<Stock> stocks = service.getAllStocks();
        assertFalse(stocks.isEmpty());
        assertNotNull(service.getStock("INFY"));

        Account acc = service.getAccount("ACC-user-alice");
        assertNotNull(acc);
        assertEquals(250000.0, acc.getCashBalance());
        assertEquals(50, acc.getPortfolio().getHolding("INFY").getQuantity());
    }

    @Test
    void testLimitOrderRestingInBook() {
        // Place Buy Limit below market price (INFY @ 1500)
        Order buyOrder = service.placeOrder("ACC-user-alice", "INFY", OrderSide.BUY, OrderType.LIMIT, 1480.0, 10);
        assertNotNull(buyOrder);
        assertEquals(OrderStatus.PENDING, buyOrder.getStatus());
        assertEquals(10, buyOrder.getRemainingQuantity());

        OrderBook book = service.getOrderBook("INFY");
        assertTrue(book.getBids().containsKey(1480.0));

        Account acc = service.getAccount("ACC-user-alice");
        assertEquals(14800.0, acc.getReservedBalance());
        assertEquals(250000.0 - 14800.0, acc.getAvailableBalance());
    }

    @Test
    void testLimitOrderImmediateFullExecution() {
        // Alice places Sell Limit @ 1490 for 10 INFY
        Order sell = service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        assertEquals(OrderStatus.PENDING, sell.getStatus());

        // Bob places Buy Limit @ 1495 for 10 INFY (Marketable against Alice's 1490)
        Order buy = service.placeOrder("ACC-user-bob", "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        assertEquals(OrderStatus.EXECUTED, buy.getStatus());
        assertEquals(OrderStatus.EXECUTED, sell.getStatus());

        // Check price update on INFY
        Stock infy = service.getStock("INFY");
        assertEquals(1490.0, infy.getCurrentPrice()); // Maker price priority
    }

    @Test
    void testMarketOrderWalkingTheBook() {
        // Alice places 2 Sell Limits at different price levels
        service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 1510.0, 10);
        service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 1520.0, 15);

        // Bob submits Market Buy for 20 shares (should consume 10 @ 1510 and 10 @ 1520)
        Order marketBuy = service.placeOrder("ACC-user-bob", "INFY", OrderSide.BUY, OrderType.MARKET, 0.0, 20);

        assertEquals(OrderStatus.EXECUTED, marketBuy.getStatus());
        assertEquals(20, marketBuy.getFilledQuantity());

        Stock infy = service.getStock("INFY");
        assertEquals(1520.0, infy.getCurrentPrice());
    }

    @Test
    void testFundReservationRacePrevention() {
        Account alice = service.getAccount("ACC-user-alice");
        double avail = alice.getAvailableBalance();

        // Attempting to buy shares that cost more than available funds
        int excessiveQty = (int) ((avail / 1500.0) + 100);

        assertThrows(InsufficientFundsException.class, () -> {
            service.placeOrder("ACC-user-alice", "INFY", OrderSide.BUY, OrderType.LIMIT, 1500.0, excessiveQty);
        });
    }

    @Test
    void testShareReservationRacePrevention() {
        Account alice = service.getAccount("ACC-user-alice");
        int heldQty = alice.getPortfolio().getHolding("INFY").getAvailableQuantity();

        // Attempting to sell more shares than owned
        assertThrows(InsufficientStockException.class, () -> {
            service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 1600.0, heldQty + 50);
        });
    }

    @Test
    void testCancelRestingOrderReleasesReservation() {
        Account alice = service.getAccount("ACC-user-alice");
        double initialAvail = alice.getAvailableBalance();

        Order buy = service.placeOrder("ACC-user-alice", "INFY", OrderSide.BUY, OrderType.LIMIT, 1400.0, 10);
        assertEquals(initialAvail - 14000.0, alice.getAvailableBalance());

        Order cancelled = service.cancelOrder(buy.getOrderId());
        assertEquals(OrderStatus.CANCELLED, cancelled.getStatus());
        assertEquals(initialAvail, alice.getAvailableBalance());
    }

    @Test
    @DisplayName("self-trade prevention rejects the order at the service level and releases the reservation")
    void testSelfTradePreventionReleasesReservation() {
        // Alice rests a sell at 1490, then tries to buy across the spread against her own order.
        service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        Account alice = service.getAccount("ACC-user-alice");
        double availableBeforeSelfBuy = alice.getAvailableBalance();

        assertThrows(OrderExecutionException.class, () ->
                service.placeOrder("ACC-user-alice", "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10));

        // The rejected order's own fund reservation must not leak.
        assertEquals(availableBeforeSelfBuy, alice.getAvailableBalance(), 0.001);
    }

    @Test
    @DisplayName("a different account can still trade at the price a same-account order would have been blocked at")
    void testDifferentAccountsStillMatchNormally() {
        Order sell = service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        Order buy = service.placeOrder("ACC-user-bob", "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        assertEquals(OrderStatus.EXECUTED, sell.getStatus());
        assertEquals(OrderStatus.EXECUTED, buy.getStatus());
    }

    @Test
    void testSimulationEngine() {
        service.simReset();
        Map<String, Object> snap = service.getSimSnapshots();
        assertNotNull(snap);
        assertTrue(snap.containsKey("stocks"));
        assertTrue(snap.containsKey("orderBooks"));

        // Place simulated order
        Map<String, Object> afterOrder = service.simPlaceOrder("SIM-ACC-ALPHA", "INFY", OrderSide.BUY, OrderType.MARKET, 0.0, 10);
        assertNotNull(afterOrder);
        assertFalse(service.getSimEvents().isEmpty());
    }
}

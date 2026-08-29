package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.OrderExecutionException;
import com.lld.stockbroker.factory.OrderFactory;
import com.lld.stockbroker.model.*;
import com.lld.stockbroker.strategy.LimitExecutionStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Exercises {@link LimitExecutionStrategy} directly against bare models — the same
 * unit-of-behaviour granularity {@code strategy/PricingStrategyFactoryTest} uses for airline —
 * so the maker-price-priority rule and self-trade guard are proven independent of the service's
 * locking/reservation plumbing.
 */
class LimitExecutionStrategyTest {

    private LimitExecutionStrategy strategy;
    private OrderBook book;
    private Stock stock;
    private Map<String, Account> accounts;
    private Account buyerAcc;
    private Account sellerAcc;

    @BeforeEach
    void setUp() {
        strategy = new LimitExecutionStrategy();
        book = new OrderBook("INFY");
        stock = new Stock("INFY", "Infosys", 1500.0);
        buyerAcc = Account.open("ACC-buyer", "buyer", 1_000_000.0);
        sellerAcc = Account.open("ACC-seller", "seller", 1_000_000.0);
        sellerAcc.getPortfolio().addInitialHolding("INFY", 1000, 1400.0);
        accounts = new HashMap<>();
        accounts.put(buyerAcc.getAccountId(), buyerAcc);
        accounts.put(sellerAcc.getAccountId(), sellerAcc);
    }

    @Test
    @DisplayName("a marketable buy executes at the resting sell's (maker) price, not its own limit")
    void makerPricePriority() {
        Order restingSell = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        sellerAcc.getPortfolio().reserveShares("INFY", 10);
        book.addRestingOrder(restingSell);

        buyerAcc.reserveFunds(1495.0 * 10);
        Order buy = OrderFactory.createOrder("B1", buyerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        List<Trade> trades = strategy.execute(buy, book, accounts, stock);

        assertEquals(1, trades.size());
        assertEquals(1490.0, trades.get(0).getPrice(), 0.001, "trade executes at the resting maker's price");
        assertEquals(OrderStatus.EXECUTED, buy.getStatus());
        assertEquals(OrderStatus.EXECUTED, restingSell.getStatus());
    }

    @Test
    @DisplayName("a partial fill leaves the remainder resting in the book on the correct side")
    void partialFillRests() {
        Order restingSell = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 4);
        sellerAcc.getPortfolio().reserveShares("INFY", 4);
        book.addRestingOrder(restingSell);

        buyerAcc.reserveFunds(1495.0 * 10);
        Order buy = OrderFactory.createOrder("B1", buyerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        strategy.execute(buy, book, accounts, stock);

        assertEquals(4, buy.getFilledQuantity());
        assertEquals(6, buy.getRemainingQuantity());
        assertEquals(OrderStatus.PARTIALLY_FILLED, buy.getStatus());
        assertTrue(book.getBids().containsKey(1495.0), "unfilled remainder rests as a new bid");
        assertEquals(6, book.getBids().get(1495.0).peek().getRemainingQuantity());
    }

    @Test
    @DisplayName("a non-crossing limit order rests without any trade")
    void nonCrossingOrderRestsOnly() {
        Order restingSell = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1510.0, 10);
        sellerAcc.getPortfolio().reserveShares("INFY", 10);
        book.addRestingOrder(restingSell);

        buyerAcc.reserveFunds(1495.0 * 10);
        Order buy = OrderFactory.createOrder("B1", buyerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        List<Trade> trades = strategy.execute(buy, book, accounts, stock);

        assertTrue(trades.isEmpty());
        assertEquals(OrderStatus.PENDING, buy.getStatus());
        assertTrue(book.getBids().containsKey(1495.0));
    }

    @Test
    @DisplayName("self-trade prevention rejects an order that would match the account's own resting order")
    void selfTradePrevented() {
        // Seller's own resting order at the top of book...
        Order ownResting = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        sellerAcc.getPortfolio().reserveShares("INFY", 10);
        book.addRestingOrder(ownResting);

        // ...and the SAME account tries to buy across the spread.
        sellerAcc.reserveFunds(1495.0 * 10);
        Order selfBuy = OrderFactory.createOrder("B1", sellerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        assertThrows(OrderExecutionException.class, () -> strategy.execute(selfBuy, book, accounts, stock));
        assertEquals(0, selfBuy.getFilledQuantity(), "no fill happens before the self-trade guard rejects the order");
        assertEquals(10, ownResting.getRemainingQuantity(), "the resting order is untouched");
    }

    @Test
    @DisplayName("a different account can still match against a resting order at the same price the guard would have blocked")
    void differentAccountStillMatchesNormally() {
        Order restingSell = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        sellerAcc.getPortfolio().reserveShares("INFY", 10);
        book.addRestingOrder(restingSell);

        buyerAcc.reserveFunds(1495.0 * 10);
        Order buy = OrderFactory.createOrder("B1", buyerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.0, 10);

        List<Trade> trades = strategy.execute(buy, book, accounts, stock);
        assertEquals(1, trades.size());
        assertEquals(OrderStatus.EXECUTED, buy.getStatus());
    }
}

package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.OrderExecutionException;
import com.lld.stockbroker.factory.OrderFactory;
import com.lld.stockbroker.model.*;
import com.lld.stockbroker.strategy.MarketExecutionStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Exercises {@link MarketExecutionStrategy} directly against bare models — immediate execution, walking multiple depth levels, and rejection when there's no liquidity at all. */
class MarketExecutionStrategyTest {

    private MarketExecutionStrategy strategy;
    private OrderBook book;
    private Stock stock;
    private Map<String, Account> accounts;
    private Account buyerAcc;
    private Account sellerAcc;

    @BeforeEach
    void setUp() {
        strategy = new MarketExecutionStrategy();
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
    @DisplayName("a market buy walks two depth levels to fill completely")
    void walksMultipleDepthLevels() {
        Order sell1 = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1510.0, 10);
        Order sell2 = OrderFactory.createOrder("S2", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1520.0, 15);
        sellerAcc.getPortfolio().reserveShares("INFY", 25);
        book.addRestingOrder(sell1);
        book.addRestingOrder(sell2);

        buyerAcc.reserveFunds(1500.0 * 20); // pre-check estimate at current stock price
        Order marketBuy = OrderFactory.createOrder("B1", buyerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.MARKET, 0.0, 20);

        List<Trade> trades = strategy.execute(marketBuy, book, accounts, stock);

        assertEquals(2, trades.size());
        assertEquals(20, marketBuy.getFilledQuantity());
        assertEquals(OrderStatus.EXECUTED, marketBuy.getStatus());
        assertEquals(1520.0, stock.getCurrentPrice(), 0.001, "last executed price becomes the new current price");
    }

    @Test
    @DisplayName("a market order with zero liquidity is rejected, not left hanging")
    void noLiquidityRejectsOrder() {
        buyerAcc.reserveFunds(1500.0 * 10);
        Order marketBuy = OrderFactory.createOrder("B1", buyerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.MARKET, 0.0, 10);

        List<Trade> trades = strategy.execute(marketBuy, book, accounts, stock);

        assertTrue(trades.isEmpty());
        assertEquals(0, marketBuy.getFilledQuantity());
        assertEquals(OrderStatus.REJECTED, marketBuy.getStatus());
    }

    @Test
    @DisplayName("self-trade prevention blocks a market order that would cross the account's own resting order")
    void selfTradePreventedForMarketOrder() {
        Order ownResting = OrderFactory.createOrder("S1", sellerAcc.getAccountId(), "INFY", OrderSide.SELL, OrderType.LIMIT, 1490.0, 10);
        sellerAcc.getPortfolio().reserveShares("INFY", 10);
        book.addRestingOrder(ownResting);

        sellerAcc.reserveFunds(1500.0 * 10);
        Order selfMarketBuy = OrderFactory.createOrder("B1", sellerAcc.getAccountId(), "INFY", OrderSide.BUY, OrderType.MARKET, 0.0, 10);

        assertThrows(OrderExecutionException.class, () -> strategy.execute(selfMarketBuy, book, accounts, stock));
        assertEquals(10, ownResting.getRemainingQuantity());
    }
}

package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.InvalidOrderException;
import com.lld.stockbroker.factory.OrderFactory;
import com.lld.stockbroker.model.BuyOrder;
import com.lld.stockbroker.model.Order;
import com.lld.stockbroker.model.SellOrder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** {@link OrderFactory} is a genuine Factory Method: BUY/SELL resolves to the concrete {@link BuyOrder}/{@link SellOrder} subclass, with validation centralized so every caller gets it for free. */
class OrderFactoryTest {

    @Test
    @DisplayName("BUY side produces a BuyOrder instance")
    void buySideProducesBuyOrder() {
        Order order = OrderFactory.createOrder("ORD-1", "acc-1", "INFY", OrderSide.BUY, OrderType.LIMIT, 100.0, 10);
        assertInstanceOf(BuyOrder.class, order);
        assertEquals(OrderSide.BUY, order.getSide());
    }

    @Test
    @DisplayName("SELL side produces a SellOrder instance")
    void sellSideProducesSellOrder() {
        Order order = OrderFactory.createOrder("ORD-2", "acc-1", "INFY", OrderSide.SELL, OrderType.LIMIT, 100.0, 10);
        assertInstanceOf(SellOrder.class, order);
        assertEquals(OrderSide.SELL, order.getSide());
    }

    @Test
    void symbolIsUppercasedAndTrimmed() {
        Order order = OrderFactory.createOrder("ORD-3", "acc-1", "  infy  ", OrderSide.BUY, OrderType.MARKET, 0.0, 10);
        assertEquals("INFY", order.getSymbol());
    }

    @Test
    void blankOrderIdRejected() {
        assertThrows(InvalidOrderException.class, () ->
                OrderFactory.createOrder(" ", "acc-1", "INFY", OrderSide.BUY, OrderType.LIMIT, 100.0, 10));
    }

    @Test
    void blankAccountIdRejected() {
        assertThrows(InvalidOrderException.class, () ->
                OrderFactory.createOrder("ORD-4", "", "INFY", OrderSide.BUY, OrderType.LIMIT, 100.0, 10));
    }

    @Test
    void blankSymbolRejected() {
        assertThrows(InvalidOrderException.class, () ->
                OrderFactory.createOrder("ORD-5", "acc-1", null, OrderSide.BUY, OrderType.LIMIT, 100.0, 10));
    }

    @Test
    void nonPositiveQuantityRejected() {
        assertThrows(InvalidOrderException.class, () ->
                OrderFactory.createOrder("ORD-6", "acc-1", "INFY", OrderSide.BUY, OrderType.LIMIT, 100.0, 0));
    }

    @Test
    void nonPositiveLimitPriceRejected() {
        assertThrows(InvalidOrderException.class, () ->
                OrderFactory.createOrder("ORD-7", "acc-1", "INFY", OrderSide.SELL, OrderType.LIMIT, 0.0, 10));
    }

    @Test
    @DisplayName("MARKET orders don't require a positive price")
    void marketOrderAllowsZeroPrice() {
        Order order = OrderFactory.createOrder("ORD-8", "acc-1", "INFY", OrderSide.BUY, OrderType.MARKET, 0.0, 10);
        assertEquals(0.0, order.getLimitPrice());
    }
}

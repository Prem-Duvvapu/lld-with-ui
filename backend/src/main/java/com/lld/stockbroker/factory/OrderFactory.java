package com.lld.stockbroker.factory;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.InvalidOrderException;
import com.lld.stockbroker.model.BuyOrder;
import com.lld.stockbroker.model.Order;
import com.lld.stockbroker.model.SellOrder;

public class OrderFactory {

    public static Order createOrder(String orderId, String accountId, String symbol,
                                    OrderSide side, OrderType type, double price, int quantity) {
        if (orderId == null || orderId.isBlank()) {
            throw new InvalidOrderException("OrderId must not be blank");
        }
        if (accountId == null || accountId.isBlank()) {
            throw new InvalidOrderException("AccountId must not be blank");
        }
        if (symbol == null || symbol.isBlank()) {
            throw new InvalidOrderException("Symbol must not be blank");
        }
        if (quantity <= 0) {
            throw new InvalidOrderException("Order quantity must be positive");
        }
        if (type == OrderType.LIMIT && price <= 0) {
            throw new InvalidOrderException("Limit order price must be positive");
        }

        if (side == OrderSide.BUY) {
            return new BuyOrder(orderId, accountId, symbol, type, price, quantity);
        } else if (side == OrderSide.SELL) {
            return new SellOrder(orderId, accountId, symbol, type, price, quantity);
        } else {
            throw new InvalidOrderException("Invalid order side: " + side);
        }
    }
}

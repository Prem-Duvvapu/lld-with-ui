package com.lld.stockbroker.model;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;

public class SellOrder extends Order {
    public SellOrder(String orderId, String accountId, String symbol, OrderType type, double limitPrice, int totalQuantity) {
        super(orderId, accountId, symbol, OrderSide.SELL, type, limitPrice, totalQuantity);
    }
}

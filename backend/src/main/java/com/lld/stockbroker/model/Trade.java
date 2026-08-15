package com.lld.stockbroker.model;

import java.time.Instant;

public class Trade {
    private final String tradeId;
    private final String symbol;
    private final String buyOrderId;
    private final String sellOrderId;
    private final String buyerAccountId;
    private final String sellerAccountId;
    private final double price;
    private final int quantity;
    private final Instant executedAt;

    public Trade(String tradeId, String symbol, String buyOrderId, String sellOrderId,
                 String buyerAccountId, String sellerAccountId, double price, int quantity) {
        this.tradeId = tradeId;
        this.symbol = symbol;
        this.buyOrderId = buyOrderId;
        this.sellOrderId = sellOrderId;
        this.buyerAccountId = buyerAccountId;
        this.sellerAccountId = sellerAccountId;
        this.price = price;
        this.quantity = quantity;
        this.executedAt = Instant.now();
    }

    public String getTradeId() {
        return tradeId;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getBuyOrderId() {
        return buyOrderId;
    }

    public String getSellOrderId() {
        return sellOrderId;
    }

    public String getBuyerAccountId() {
        return buyerAccountId;
    }

    public String getSellerAccountId() {
        return sellerAccountId;
    }

    public double getPrice() {
        return price;
    }

    public int getQuantity() {
        return quantity;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }
}

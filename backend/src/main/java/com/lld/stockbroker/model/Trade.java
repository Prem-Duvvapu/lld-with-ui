package com.lld.stockbroker.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

/** An immutable record of one executed fill between a buy order and a sell order. */
@Getter
@Builder
public class Trade {
    private final String tradeId;
    private final String symbol;
    private final String buyOrderId;
    private final String sellOrderId;
    private final String buyerAccountId;
    private final String sellerAccountId;
    private final double price;
    private final int quantity;
    @Builder.Default
    private final Instant executedAt = Instant.now();
}

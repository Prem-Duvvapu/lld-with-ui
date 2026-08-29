package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.strategy.LimitExecutionStrategy;
import com.lld.stockbroker.strategy.MarketExecutionStrategy;
import com.lld.stockbroker.strategy.OrderExecutionStrategyFactory;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertSame;

/**
 * Same EnumMap-resolved shape as {@code inventory.strategy.ReorderStrategyFactory}: one
 * {@link OrderType} maps to exactly one {@code OrderExecutionStrategy} instance, resolved once at
 * construction time rather than branched on at every call site.
 */
class OrderExecutionStrategyFactoryTest {

    @Test
    void resolvesMarketOrdersToMarketExecutionStrategy() {
        MarketExecutionStrategy market = new MarketExecutionStrategy();
        LimitExecutionStrategy limit = new LimitExecutionStrategy();
        OrderExecutionStrategyFactory factory = new OrderExecutionStrategyFactory(market, limit);

        assertSame(market, factory.forType(OrderType.MARKET));
    }

    @Test
    void resolvesLimitOrdersToLimitExecutionStrategy() {
        MarketExecutionStrategy market = new MarketExecutionStrategy();
        LimitExecutionStrategy limit = new LimitExecutionStrategy();
        OrderExecutionStrategyFactory factory = new OrderExecutionStrategyFactory(market, limit);

        assertSame(limit, factory.forType(OrderType.LIMIT));
    }
}

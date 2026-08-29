package com.lld.stockbroker.strategy;

import com.lld.stockbroker.enums.OrderType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link OrderType} to its {@link OrderExecutionStrategy} via an EnumMap built once —
 * the same shape as {@code inventory.strategy.ReorderStrategyFactory} /
 * {@code atm.strategy.DenominationDispenseStrategyFactory}. Adding a new order type (e.g.
 * STOP_LOSS) is one enum constant, one implementation, one put — {@link com.lld.stockbroker.service.StockBrokerService}
 * never branches on {@link OrderType} itself.
 */
@Component
public class OrderExecutionStrategyFactory {

    private final Map<OrderType, OrderExecutionStrategy> strategies = new EnumMap<>(OrderType.class);

    public OrderExecutionStrategyFactory(MarketExecutionStrategy marketExecutionStrategy,
                                         LimitExecutionStrategy limitExecutionStrategy) {
        strategies.put(OrderType.MARKET, marketExecutionStrategy);
        strategies.put(OrderType.LIMIT, limitExecutionStrategy);
    }

    public OrderExecutionStrategy forType(OrderType type) {
        return strategies.get(type);
    }
}

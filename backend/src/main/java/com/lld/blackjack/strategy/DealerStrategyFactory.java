package com.lld.blackjack.strategy;

import com.lld.blackjack.model.DealerStrategyType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link DealerStrategyType} to its strategy via an EnumMap built once — the same shape
 * as {@code locker.strategy.LockerAllocationStrategyFactory}.
 */
@Component
public class DealerStrategyFactory {

    private final Map<DealerStrategyType, DealerStrategy> strategies = new EnumMap<>(DealerStrategyType.class);

    public DealerStrategyFactory(HitOnSoft17Strategy hitOnSoft17, StandOnSoft17Strategy standOnSoft17) {
        strategies.put(DealerStrategyType.HIT_ON_SOFT_17, hitOnSoft17);
        strategies.put(DealerStrategyType.STAND_ON_SOFT_17, standOnSoft17);
    }

    public DealerStrategy forType(DealerStrategyType type) {
        DealerStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("No DealerStrategy registered for type " + type);
        }
        return strategy;
    }
}

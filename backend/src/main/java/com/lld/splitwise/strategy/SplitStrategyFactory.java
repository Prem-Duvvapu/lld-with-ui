package com.lld.splitwise.strategy;

import com.lld.splitwise.model.SplitType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

@Component
public class SplitStrategyFactory {
    private final Map<SplitType, SplitStrategy> strategies = new EnumMap<>(SplitType.class);

    public SplitStrategyFactory() {
        strategies.put(SplitType.EQUAL, new EqualSplitStrategy());
        strategies.put(SplitType.PERCENTAGE, new PercentageSplitStrategy());
        strategies.put(SplitType.EXACT, new ExactSplitStrategy());
    }

    public SplitStrategy getStrategy(SplitType type) {
        SplitStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported split type: " + type);
        }
        return strategy;
    }
}

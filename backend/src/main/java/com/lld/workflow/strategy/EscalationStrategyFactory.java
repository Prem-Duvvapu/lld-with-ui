package com.lld.workflow.strategy;

import com.lld.workflow.model.EscalationStrategyType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link EscalationStrategyType} to its strategy via an EnumMap built once — the same
 * shape as {@code locker.strategy.LockerAllocationStrategyFactory}.
 */
@Component
public class EscalationStrategyFactory {

    private final Map<EscalationStrategyType, EscalationStrategy> strategies = new EnumMap<>(EscalationStrategyType.class);

    public EscalationStrategyFactory(AutoEscalateStrategy autoEscalate, NotifyOnlyStrategy notifyOnly) {
        strategies.put(EscalationStrategyType.AUTO_ESCALATE, autoEscalate);
        strategies.put(EscalationStrategyType.NOTIFY_ONLY, notifyOnly);
    }

    public EscalationStrategy forType(EscalationStrategyType type) {
        EscalationStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("No EscalationStrategy registered for type " + type);
        }
        return strategy;
    }
}

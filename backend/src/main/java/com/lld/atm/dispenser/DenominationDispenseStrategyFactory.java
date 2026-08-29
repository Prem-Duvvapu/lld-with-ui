package com.lld.atm.dispenser;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link DispenseMode} to its strategy via an EnumMap built once — the same shape as
 * {@code com.lld.inventory.strategy.ReorderStrategyFactory}. Adding a mode is one enum constant,
 * one implementation, one put.
 */
@Component
public class DenominationDispenseStrategyFactory {

    private final Map<DispenseMode, DenominationDispenseStrategy> strategies = new EnumMap<>(DispenseMode.class);

    public DenominationDispenseStrategyFactory(GreedyDenominationDispenseStrategy minimizeNotes,
                                                ConserveLargeNotesDispenseStrategy conserveLargeNotes) {
        strategies.put(DispenseMode.MINIMIZE_NOTES, minimizeNotes);
        strategies.put(DispenseMode.CONSERVE_LARGE_NOTES, conserveLargeNotes);
    }

    public DenominationDispenseStrategy forMode(DispenseMode mode) {
        DenominationDispenseStrategy strategy = strategies.get(mode);
        if (strategy == null) {
            throw new IllegalArgumentException("No DenominationDispenseStrategy registered for mode " + mode);
        }
        return strategy;
    }
}

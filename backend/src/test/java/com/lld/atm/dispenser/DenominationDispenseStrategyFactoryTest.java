package com.lld.atm.dispenser;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class DenominationDispenseStrategyFactoryTest {

    private final GreedyDenominationDispenseStrategy greedy = new GreedyDenominationDispenseStrategy();
    private final ConserveLargeNotesDispenseStrategy conserve = new ConserveLargeNotesDispenseStrategy();
    private final DenominationDispenseStrategyFactory factory =
            new DenominationDispenseStrategyFactory(greedy, conserve);

    @Test
    public void resolvesMinimizeNotesToTheGreedyStrategy() {
        assertSame(greedy, factory.forMode(DispenseMode.MINIMIZE_NOTES));
    }

    @Test
    public void resolvesConserveLargeNotesToTheConservativeStrategy() {
        assertSame(conserve, factory.forMode(DispenseMode.CONSERVE_LARGE_NOTES));
    }

    @Test
    public void everyDispenseModeConstantResolvesToSomeStrategy() {
        for (DispenseMode mode : DispenseMode.values()) {
            assertNotNull(factory.forMode(mode), "no strategy registered for " + mode);
        }
    }
}

package com.lld.blackjack.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class RoundStatusTest {

    @Test
    void aTableCanNeverSkipAStateOrGoBackward() {
        Table table = new Table("T1", DealerStrategyType.HIT_ON_SOFT_17);
        assertThrows(IllegalStateException.class, () -> table.transitionTo(RoundStatus.PLAYER_TURN),
                "BETTING cannot jump straight to PLAYER_TURN, skipping DEALING");

        table.transitionTo(RoundStatus.DEALING);
        assertThrows(IllegalStateException.class, () -> table.transitionTo(RoundStatus.BETTING),
                "DEALING cannot move backward to BETTING");

        table.transitionTo(RoundStatus.PLAYER_TURN);
        table.transitionTo(RoundStatus.DEALER_TURN);
        table.transitionTo(RoundStatus.SETTLEMENT);
        assertTrue(RoundStatus.SETTLEMENT.isTerminal());
        assertThrows(IllegalStateException.class, () -> table.transitionTo(RoundStatus.BETTING),
                "SETTLEMENT is terminal -- a new round needs a new table in this simplified model");
    }
}

package com.lld.blackjack.model;

import lombok.Getter;
import lombok.Setter;

/**
 * A single table playing against the shared {@code Shoe} — {@code status} is mutated only
 * through {@link #transitionTo}, the one place a round's lifecycle can move, matching the
 * declared-transition-table idiom used across the repo (e.g. {@code uber.model.Ride}).
 */
@Getter
public class Table {

    private final String id;
    private final DealerStrategyType dealerStrategyType;
    private final Hand playerHand = new Hand();
    private final Hand dealerHand = new Hand();
    private volatile RoundStatus status;

    @Setter
    private volatile RoundOutcome outcome;

    public Table(String id, DealerStrategyType dealerStrategyType) {
        this.id = id;
        this.dealerStrategyType = dealerStrategyType;
        this.status = RoundStatus.BETTING;
    }

    public void transitionTo(RoundStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new IllegalStateException("Table " + id + " cannot move from " + status + " to " + target);
        }
        this.status = target;
    }
}

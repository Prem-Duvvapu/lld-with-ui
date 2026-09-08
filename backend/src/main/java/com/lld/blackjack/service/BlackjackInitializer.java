package com.lld.blackjack.service;

import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.Table;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds a couple of demo tables (one fully played out) so the UI shows something on first load. */
@Component
public class BlackjackInitializer implements CommandLineRunner {

    private final BlackjackService blackjackService;

    public BlackjackInitializer(BlackjackService blackjackService) {
        this.blackjackService = blackjackService;
    }

    @Override
    public void run(String... args) {
        Table table1 = blackjackService.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        blackjackService.deal(table1.getId());
        if (table1.getStatus() == com.lld.blackjack.model.RoundStatus.PLAYER_TURN) {
            blackjackService.stand(table1.getId());
        }

        Table table2 = blackjackService.createTable(DealerStrategyType.STAND_ON_SOFT_17);
        blackjackService.deal(table2.getId());
    }
}

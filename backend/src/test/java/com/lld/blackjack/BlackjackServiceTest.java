package com.lld.blackjack;

import com.lld.blackjack.exception.InvalidActionException;
import com.lld.blackjack.exception.TableNotFoundException;
import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.RoundStatus;
import com.lld.blackjack.model.Table;
import com.lld.blackjack.repository.BlackjackRepository;
import com.lld.blackjack.service.BlackjackService;
import com.lld.blackjack.strategy.DealerStrategyFactory;
import com.lld.blackjack.strategy.HitOnSoft17Strategy;
import com.lld.blackjack.strategy.StandOnSoft17Strategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class BlackjackServiceTest {

    private BlackjackService service;

    @BeforeEach
    void setUp() {
        DealerStrategyFactory factory = new DealerStrategyFactory(new HitOnSoft17Strategy(), new StandOnSoft17Strategy());
        service = new BlackjackService(new BlackjackRepository(), factory);
    }

    @Test
    void createTableStartsInBetting() {
        Table table = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        assertEquals(RoundStatus.BETTING, table.getStatus());
    }

    @Test
    void dealingGivesTwoCardsEachAndMovesToPlayerTurnUnlessNaturalBlackjack() {
        Table table = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        service.deal(table.getId());

        assertEquals(2, table.getPlayerHand().getCards().size());
        assertEquals(2, table.getDealerHand().getCards().size());
        assertTrue(table.getStatus() == RoundStatus.PLAYER_TURN || table.getStatus() == RoundStatus.SETTLEMENT);
    }

    @Test
    void dealingTwiceOnTheSameTableThrowsInvalidActionException() {
        Table table = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        service.deal(table.getId());
        // Regardless of whether the first deal settled immediately (natural blackjack) or is
        // mid-round, a second deal() call is never valid from anything but BETTING.
        assertThrows(InvalidActionException.class, () -> service.deal(table.getId()));
    }

    @Test
    void hittingBeforeDealingThrowsInvalidActionException() {
        Table table = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        assertThrows(InvalidActionException.class, () -> service.hit(table.getId()));
    }

    @Test
    void standingMovesThroughDealerTurnToSettlementWithAnOutcome() {
        Table table = service.createTable(DealerStrategyType.STAND_ON_SOFT_17);
        service.deal(table.getId());
        if (table.getStatus() == RoundStatus.PLAYER_TURN) {
            service.stand(table.getId());
            assertEquals(RoundStatus.SETTLEMENT, table.getStatus());
            assertNotNull(table.getOutcome());
        }
    }

    @Test
    void standingAfterSettlementThrowsInvalidActionException() {
        Table table = service.createTable(DealerStrategyType.STAND_ON_SOFT_17);
        service.deal(table.getId());
        if (table.getStatus() == RoundStatus.SETTLEMENT) {
            assertThrows(InvalidActionException.class, () -> service.stand(table.getId()));
        }
    }

    @Test
    void unknownTableIdThrowsTableNotFoundException() {
        assertThrows(TableNotFoundException.class, () -> service.getTable("nope"));
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        Map<String, Object> snapshot = service.simCreateTable(DealerStrategyType.HIT_ON_SOFT_17);

        @SuppressWarnings("unchecked")
        List<Table> simTables = (List<Table>) (List<?>) snapshot.get("tables");
        assertEquals(1, simTables.size(), "the sim sandbox must only ever see its own tables");
        assertEquals(1, service.getAllTables().size(), "the live table count must be untouched by sim activity");
    }

    @Test
    void simResetWipesSimStateBackToClean() {
        service.simCreateTable(DealerStrategyType.HIT_ON_SOFT_17);
        service.initSimState();

        Map<String, Object> snapshot = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Table> simTables = (List<Table>) (List<?>) snapshot.get("tables");
        assertTrue(simTables.isEmpty());
    }

    @Test
    void simRaceAcrossManyTablesNeverProducesADuplicateCard() throws InterruptedException {
        Map<String, Object> snapshot = service.simRace(10);

        @SuppressWarnings("unchecked")
        Map<String, Object> raceResult = (Map<String, Object>) snapshot.get("raceResult");
        assertEquals(Boolean.FALSE, raceResult.get("duplicateCardDetected"));
    }
}

package com.lld.blackjack.service;

import com.lld.blackjack.exception.InvalidActionException;
import com.lld.blackjack.exception.ShoeExhaustedException;
import com.lld.blackjack.model.Card;
import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.RoundOutcome;
import com.lld.blackjack.model.RoundStatus;
import com.lld.blackjack.model.SimEvent;
import com.lld.blackjack.model.Table;
import com.lld.blackjack.repository.BlackjackRepository;
import com.lld.blackjack.shoe.Deck;
import com.lld.blackjack.shoe.Shoe;
import com.lld.blackjack.strategy.DealerStrategy;
import com.lld.blackjack.strategy.DealerStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Facade owning every table and the isolated simulation engine. {@link Shoe#draw()} is the
 * concurrency centerpiece — see its javadoc. Every action here (deal/hit/stand) draws from the
 * ONE {@link Shoe} shared by every table in the same repository, so two tables dealt
 * concurrently can never receive the same physical card.
 */
@Service
public class BlackjackService {

    private static final int LIVE_DECK_COUNT = 6;
    private static final int SIM_DECK_COUNT = 1;

    private final BlackjackRepository repository;
    private final DealerStrategyFactory dealerStrategyFactory;
    private final AtomicLong tableIdGen = new AtomicLong(1001);

    // Isolated Simulation Engine State
    private final BlackjackRepository simRepository = new BlackjackRepository();
    private final AtomicLong simTableIdGen = new AtomicLong(1);
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public BlackjackService(BlackjackRepository repository, DealerStrategyFactory dealerStrategyFactory) {
        this.repository = repository;
        this.dealerStrategyFactory = dealerStrategyFactory;
        repository.setShoe(Deck.of(LIVE_DECK_COUNT));
        initSimState();
    }

    public Table createTable(DealerStrategyType dealerStrategyType) {
        return doCreateTable(repository, tableIdGen, dealerStrategyType);
    }

    public Table getTable(String tableId) {
        return repository.getTable(tableId);
    }

    public List<Table> getAllTables() {
        return repository.getAllTables();
    }

    public Table deal(String tableId) {
        return doDeal(repository, tableId);
    }

    public Table hit(String tableId) {
        return doHit(repository, tableId);
    }

    public Table stand(String tableId) {
        return doStand(repository, tableId);
    }

    private Table doCreateTable(BlackjackRepository targetRepository, AtomicLong idGen, DealerStrategyType dealerStrategyType) {
        Table table = new Table("TABLE-" + idGen.getAndIncrement(), dealerStrategyType);
        targetRepository.addTable(table);
        return table;
    }

    private Table doDeal(BlackjackRepository targetRepository, String tableId) {
        Table table = targetRepository.getTable(tableId);
        if (table.getStatus() != RoundStatus.BETTING) {
            throw new InvalidActionException("Table " + tableId + " cannot deal from status " + table.getStatus());
        }
        Shoe shoe = targetRepository.getShoe();
        table.transitionTo(RoundStatus.DEALING);
        table.getPlayerHand().addCard(shoe.draw());
        table.getDealerHand().addCard(shoe.draw());
        table.getPlayerHand().addCard(shoe.draw());
        table.getDealerHand().addCard(shoe.draw());
        table.transitionTo(RoundStatus.PLAYER_TURN);

        if (table.getPlayerHand().isBlackjack()) {
            table.transitionTo(RoundStatus.DEALER_TURN);
            table.transitionTo(RoundStatus.SETTLEMENT);
            table.setOutcome(table.getDealerHand().isBlackjack() ? RoundOutcome.PUSH : RoundOutcome.PLAYER_BLACKJACK);
        }
        return table;
    }

    private Table doHit(BlackjackRepository targetRepository, String tableId) {
        Table table = targetRepository.getTable(tableId);
        if (table.getStatus() != RoundStatus.PLAYER_TURN) {
            throw new InvalidActionException("Table " + tableId + " cannot hit from status " + table.getStatus());
        }
        table.getPlayerHand().addCard(targetRepository.getShoe().draw());
        if (table.getPlayerHand().isBust()) {
            table.transitionTo(RoundStatus.DEALER_TURN);
            table.transitionTo(RoundStatus.SETTLEMENT);
            table.setOutcome(RoundOutcome.DEALER_WIN);
        }
        return table;
    }

    private Table doStand(BlackjackRepository targetRepository, String tableId) {
        Table table = targetRepository.getTable(tableId);
        if (table.getStatus() != RoundStatus.PLAYER_TURN) {
            throw new InvalidActionException("Table " + tableId + " cannot stand from status " + table.getStatus());
        }
        table.transitionTo(RoundStatus.DEALER_TURN);
        DealerStrategy strategy = dealerStrategyFactory.forType(table.getDealerStrategyType());
        Shoe shoe = targetRepository.getShoe();
        while (!table.getDealerHand().isBust() && strategy.shouldHit(table.getDealerHand())) {
            table.getDealerHand().addCard(shoe.draw());
        }
        table.transitionTo(RoundStatus.SETTLEMENT);
        table.setOutcome(determineOutcome(table));
        return table;
    }

    private RoundOutcome determineOutcome(Table table) {
        if (table.getDealerHand().isBust()) {
            return RoundOutcome.PLAYER_WIN;
        }
        int playerValue = table.getPlayerHand().getValue();
        int dealerValue = table.getDealerHand().getValue();
        if (playerValue > dealerValue) {
            return RoundOutcome.PLAYER_WIN;
        }
        if (playerValue < dealerValue) {
            return RoundOutcome.DEALER_WIN;
        }
        return RoundOutcome.PUSH;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simRepository.setShoe(Deck.of(SIM_DECK_COUNT));
        simEventLog.clear();
        logSimEvent("SIM_RESET", "System", String.format(
                "Sandbox reset -- fresh %d-card shoe (%d deck(s)), no tables", SIM_DECK_COUNT * 52, SIM_DECK_COUNT), null);
    }

    public Map<String, Object> simCreateTable(DealerStrategyType dealerStrategyType) {
        Table table = doCreateTable(simRepository, simTableIdGen, dealerStrategyType);
        logSimEvent("TABLE_CREATED", "System", "Created " + table.getId() + " (" + dealerStrategyType + ")", null);
        return getSimSnapshots();
    }

    public Map<String, Object> simDeal(String tableId) {
        try {
            Table table = doDeal(simRepository, tableId);
            logSimEvent("DEALT", "System", tableId + " dealt: player=" + table.getPlayerHand().getValue()
                    + ", dealer=" + table.getDealerHand().getValue()
                    + (table.getOutcome() != null ? " -- " + table.getOutcome() : ""), null);
        } catch (ShoeExhaustedException e) {
            logSimEvent("SHOE_EXHAUSTED", "System", tableId + " could not deal: " + e.getMessage(), null);
        }
        return getSimSnapshots();
    }

    public Map<String, Object> simHit(String tableId) {
        Table table = doHit(simRepository, tableId);
        logSimEvent("HIT", "System", tableId + " hit: player now " + table.getPlayerHand().getValue()
                + (table.getPlayerHand().isBust() ? " -- BUST" : ""), null);
        return getSimSnapshots();
    }

    public Map<String, Object> simStand(String tableId) {
        Table table = doStand(simRepository, tableId);
        logSimEvent("STAND", "System", tableId + " stood: dealer played out to " + table.getDealerHand().getValue()
                + " -- " + table.getOutcome(), null);
        return getSimSnapshots();
    }

    /**
     * Live demonstration of shared-shoe safety: {@code tableCount} tables concurrently deal
     * from the SAME sim shoe. Not {@code synchronized} -- a method-level lock here would
     * serialize every table before any of them reached {@link Shoe#draw()}'s atomic cursor, and
     * the race this module exists to demonstrate would never actually happen.
     */
    public Map<String, Object> simRace(int tableCount) throws InterruptedException {
        List<Table> raceTables = new ArrayList<>();
        for (int i = 0; i < tableCount; i++) {
            raceTables.add(doCreateTable(simRepository, simTableIdGen, DealerStrategyType.HIT_ON_SOFT_17));
        }

        ExecutorService executor = Executors.newFixedThreadPool(tableCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(tableCount);
        AtomicInteger dealt = new AtomicInteger(0);
        AtomicInteger exhausted = new AtomicInteger(0);

        for (Table table : raceTables) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    doDeal(simRepository, table.getId());
                    dealt.incrementAndGet();
                    logSimEvent("DEALT", table.getId(), table.getId() + " dealt successfully from the shared shoe", null);
                } catch (ShoeExhaustedException e) {
                    exhausted.incrementAndGet();
                    logSimEvent("SHOE_EXHAUSTED", table.getId(), table.getId() + " could not deal -- shoe exhausted", null);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        Set<Card> allDealtCards = new HashSet<>();
        boolean duplicateCardDetected = false;
        for (Table table : raceTables) {
            for (Card card : table.getPlayerHand().getCards()) {
                if (!allDealtCards.add(card)) {
                    duplicateCardDetected = true;
                }
            }
            for (Card card : table.getDealerHand().getCards()) {
                if (!allDealtCards.add(card)) {
                    duplicateCardDetected = true;
                }
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("tables", tableCount);
        details.put("dealt", dealt.get());
        details.put("exhausted", exhausted.get());
        details.put("duplicateCardDetected", duplicateCardDetected);
        details.put("shoeRemaining", simRepository.getShoe().remaining());
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "%d tables raced to deal from the shared shoe -- %d dealt, %d exhausted, %d cards remain",
                tableCount, dealt.get(), exhausted.get(), simRepository.getShoe().remaining()), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("tables", simRepository.getAllTables());
        res.put("shoeRemaining", simRepository.getShoe().remaining());
        res.put("shoeSize", simRepository.getShoe().size());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}

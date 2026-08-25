package com.lld.snakeladders.service;

import com.lld.snakeladders.dice.DiceRoller;
import com.lld.snakeladders.exception.GameAlreadyFinishedException;
import com.lld.snakeladders.exception.GameNotFoundException;
import com.lld.snakeladders.exception.InvalidPlayerCountException;
import com.lld.snakeladders.model.Game;
import com.lld.snakeladders.model.GameState;
import com.lld.snakeladders.model.Player;
import com.lld.snakeladders.model.SimEvent;
import com.lld.snakeladders.repository.GameRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade for the whole module: player setup, dice rolls, snake/ladder resolution and the
 * isolated {@code /sim/*} demo engine. The controller only translates HTTP; every rule lives
 * here or in {@link Game#rollAndMove()}.
 *
 * <p>Concurrency: each game gets its own {@link ReentrantLock}, taken for the whole
 * read-validate-mutate span of {@link #rollDice} — mirrors {@code ChessService}'s per-game
 * locking so two near-simultaneous roll requests for the same game cannot both read the pre-roll
 * position and both mutate it (double-move / turn skipping otherwise).
 */
@Service
public class SnakeLaddersService {

    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 4;
    private static final List<String> COLORS = List.of("#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4");

    private static final Map<Integer, Integer> DEFAULT_SNAKES = Map.ofEntries(
            Map.entry(99, 54), Map.entry(95, 75), Map.entry(89, 25),
            Map.entry(62, 19), Map.entry(46, 5), Map.entry(34, 1)
    );

    private static final Map<Integer, Integer> DEFAULT_LADDERS = Map.ofEntries(
            Map.entry(2, 38), Map.entry(7, 14), Map.entry(8, 31), Map.entry(15, 26),
            Map.entry(21, 42), Map.entry(28, 84), Map.entry(36, 44), Map.entry(51, 67),
            Map.entry(71, 91), Map.entry(78, 98), Map.entry(87, 94)
    );

    private final GameRepository repository;
    private final DiceRoller diceRoller;
    private final ConcurrentHashMap<String, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    // Isolated simulation engine — a separate repository instance so the demo cannot corrupt
    // real game state, mirroring chess's simRepository pattern.
    private final GameRepository simRepository = new GameRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private volatile String simGameId = null;

    public SnakeLaddersService(@Qualifier("snakeladdersGameRepository") GameRepository repository,
                                DiceRoller diceRoller) {
        this.repository = repository;
        this.diceRoller = diceRoller;
    }

    // =========================================================================
    // LIVE GAME API
    // =========================================================================

    public Game createGame(List<String> playerNames) {
        validatePlayerCount(playerNames);
        return newGame(repository, playerNames, diceRoller);
    }

    public Game getGame(String id) {
        Game game = repository.get(id);
        if (game == null) throw new GameNotFoundException("Game not found: " + id);
        return game;
    }

    public Game rollDice(String gameId) {
        ReentrantLock lock = gameLocks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = getGame(gameId);
            if (game.getState() != GameState.IN_PROGRESS) {
                throw new GameAlreadyFinishedException("Game " + gameId + " has already finished");
            }
            game.rollAndMove();
            return game;
        } finally {
            lock.unlock();
        }
    }

    // =========================================================================
    // SHARED SETUP
    // =========================================================================

    private void validatePlayerCount(List<String> playerNames) {
        int count = playerNames == null ? 0 : playerNames.size();
        if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
            throw new InvalidPlayerCountException(
                    "Snake & Ladders needs between " + MIN_PLAYERS + " and " + MAX_PLAYERS
                            + " players, got: " + count);
        }
    }

    private Game newGame(GameRepository targetRepository, List<String> playerNames, DiceRoller roller) {
        String id = targetRepository.generateId();
        Game game = new Game(id, playerNames, COLORS.subList(0, playerNames.size()),
                DEFAULT_SNAKES, DEFAULT_LADDERS, roller);
        targetRepository.save(game);
        return game;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/snakeladders/sim/*)
    // =========================================================================

    public Game simReset() {
        Game game = newGame(simRepository, List.of("Player 1", "Player 2"), diceRoller);
        simGameId = game.getId();
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent(game, "system", "Simulation reset — new 2-player game, default snakes & ladders.", 0);
        return game;
    }

    public Game simGetGame() {
        if (simGameId == null) return simReset();
        return simRepository.get(simGameId);
    }

    public List<SimEvent> simGetEventLog() {
        return new ArrayList<>(simEventLog);
    }

    public Game simRoll() {
        if (simGameId == null) simReset();
        Game game = simRepository.get(simGameId);
        if (game.getState() != GameState.IN_PROGRESS) {
            throw new GameAlreadyFinishedException("Simulation game has already finished — reset to play again");
        }
        Player actor = game.getCurrentPlayer();
        int dice = game.rollAndMove();
        logSimEvent(game, actor.getName(), game.getLastMessage(), dice);
        return game;
    }

    private void logSimEvent(Game game, String actor, String description, int diceValue) {
        List<Player> snapshot = new ArrayList<>();
        for (Player p : game.getPlayers()) {
            Player copy = new Player(p.getName(), p.getColor());
            copy.setPosition(p.getPosition());
            snapshot.add(copy);
        }
        simEventLog.add(SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(Instant.now().toString())
                .actor(actor)
                .description(description)
                .diceValue(diceValue)
                .playersSnapshot(snapshot)
                .status(game.getState())
                .build());
    }
}

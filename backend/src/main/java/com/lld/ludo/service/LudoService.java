package com.lld.ludo.service;

import com.lld.ludo.dice.DiceRoller;
import com.lld.ludo.exception.GameNotFoundException;
import com.lld.ludo.exception.GameOverException;
import com.lld.ludo.exception.InvalidMoveException;
import com.lld.ludo.exception.InvalidPlayerCountException;
import com.lld.ludo.exception.NotYourTurnException;
import com.lld.ludo.model.Game;
import com.lld.ludo.model.GameStatus;
import com.lld.ludo.model.SimEvent;
import com.lld.ludo.model.Token;
import com.lld.ludo.model.TokenStatus;
import com.lld.ludo.repository.LudoRepository;
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
 * Facade for the whole module: game setup, dice rolls, token movement (captures, safe spots,
 * exact-count home entry) and the isolated {@code /sim/*} demo engine. The controller only
 * translates HTTP; every rule lives here or in {@link Token#transitionTo(TokenStatus)}.
 *
 * <p><b>Concurrency</b>: each game gets its own {@link ReentrantLock} (lazily created, same
 * {@code computeIfAbsent} idiom as {@code TaskService}/{@code SnakeLaddersService}), replacing the
 * previous single module-wide lock that serialized every unrelated game against every other for no
 * reason. The die is rolled <em>inside</em> the lock (see {@link #doRoll}) — rolling outside the
 * lock and only writing the result inside it would reopen the exact
 * read-{@code diceValue}-then-act race the lock exists to close.
 *
 * <p><b>Roll/move contract</b>: a game alternates strictly between "no pending roll"
 * ({@code diceValue == 0} — the caller must call {@link #rollDice}) and "pending roll"
 * ({@code diceValue != 0} — the caller must call {@link #moveToken} before rolling again).
 * {@link #doRoll} rejects a second roll while one is still pending, and {@link #doMove} rejects a
 * move before any roll — see RCA-022 for the bug this closed (a caller could previously re-roll
 * for a better number without ever spending the first one).
 *
 * <p><b>Rolling a 6 always grants the same player another roll</b>, with no cap on consecutive
 * sixes — the classic "three sixes forfeits the turn" house rule is intentionally out of scope
 * for this module.
 */
@Service
public class LudoService {

    private final LudoRepository repository;
    private final DiceRoller diceRoller;
    private final ConcurrentHashMap<Long, ReentrantLock> gameLocks = new ConcurrentHashMap<>();

    // Isolated simulation engine — a separate repository instance so the demo cannot corrupt real
    // game state, mirroring snakeladders'/minesweeper's simRepository pattern.
    private final LudoRepository simRepository = new LudoRepository();
    private final ConcurrentHashMap<Long, ReentrantLock> simLocks = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private volatile Long simGameId = null;

    private static final List<String> SIM_PLAYER_NAMES = List.of("Alice", "Bob", "Charlie", "Diana");

    public LudoService(LudoRepository repository, DiceRoller diceRoller) {
        this.repository = repository;
        this.diceRoller = diceRoller;
    }

    /** Outcome of one {@link #doRoll} call — kept internal so the public API still just returns {@link Game}. */
    private record RollOutcome(Game game, int rolledValue, boolean turnPassed) {}

    // =========================================================================
    // LIVE GAME API
    // =========================================================================

    public Game createGame(List<String> playerNames) {
        validatePlayerCount(playerNames);
        return newGame(repository, playerNames);
    }

    public Game getGame(long id) {
        return requireGame(repository, id);
    }

    public Game rollDice(long gameId) {
        return doRoll(repository, gameLocks, gameId).game();
    }

    public Game moveToken(long gameId, int playerIndex, int tokenIndex) {
        return doMove(repository, gameLocks, gameId, playerIndex, tokenIndex);
    }

    // =========================================================================
    // SHARED SETUP / VALIDATION
    // =========================================================================

    private void validatePlayerCount(List<String> playerNames) {
        int count = playerNames == null ? 0 : playerNames.size();
        if (count != Game.PLAYER_COUNT) {
            throw new InvalidPlayerCountException(
                    "Ludo needs exactly " + Game.PLAYER_COUNT + " player names, got: " + count);
        }
        for (String name : playerNames) {
            if (name == null || name.isBlank()) {
                throw new InvalidPlayerCountException("Player names must be non-blank");
            }
        }
    }

    private Game newGame(LudoRepository targetRepository, List<String> playerNames) {
        long id = targetRepository.nextId();
        Game game = Game.newGame(id, playerNames);
        targetRepository.save(game);
        return game;
    }

    private Game requireGame(LudoRepository targetRepository, long id) {
        Game game = targetRepository.get(id);
        if (game == null) throw new GameNotFoundException("Game not found: " + id);
        return game;
    }

    // =========================================================================
    // CORE MOVE ENGINE (shared by live and sim paths)
    // =========================================================================

    private RollOutcome doRoll(LudoRepository repo, Map<Long, ReentrantLock> locks, long gameId) {
        ReentrantLock lock = locks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = requireGame(repo, gameId);
            if (game.getStatus() == GameStatus.FINISHED) {
                throw new GameOverException("Game " + gameId + " has already finished");
            }
            if (game.getDiceValue() != 0) {
                throw new InvalidMoveException(
                        "Already rolled a " + game.getDiceValue() + " — move a token before rolling again");
            }

            int dice = diceRoller.roll();
            boolean anyMove = hasAnyLegalMove(game, game.getCurrentPlayerIndex(), dice);
            boolean turnPassed = false;
            if (anyMove) {
                game.setDiceValue(dice);
            } else {
                turnPassed = true;
                nextTurn(game);
            }
            repo.save(game);
            return new RollOutcome(game, dice, turnPassed);
        } finally {
            lock.unlock();
        }
    }

    private Game doMove(LudoRepository repo, Map<Long, ReentrantLock> locks, long gameId, int playerIndex, int tokenIndex) {
        ReentrantLock lock = locks.computeIfAbsent(gameId, k -> new ReentrantLock());
        lock.lock();
        try {
            Game game = requireGame(repo, gameId);
            if (game.getStatus() == GameStatus.FINISHED) {
                throw new GameOverException("Game " + gameId + " has already finished");
            }
            if (playerIndex < 0 || playerIndex >= Game.PLAYER_COUNT) {
                throw new InvalidMoveException("Invalid player index: " + playerIndex);
            }
            if (game.getCurrentPlayerIndex() != playerIndex) {
                throw new NotYourTurnException(
                        "It is player " + game.getCurrentPlayerIndex() + "'s turn, not player " + playerIndex);
            }
            int dice = game.getDiceValue();
            if (dice == 0) {
                throw new InvalidMoveException("Roll the dice before moving a token");
            }

            List<Token> playerTokens = game.getTokens().get(playerIndex);
            if (tokenIndex < 0 || tokenIndex >= playerTokens.size()) {
                throw new InvalidMoveException("Invalid token index: " + tokenIndex);
            }
            Token token = playerTokens.get(tokenIndex);

            if (token.getStatus() == TokenStatus.FINISHED) {
                throw new InvalidMoveException("Token " + tokenIndex + " has already finished — pick another token");
            }

            if (token.getStatus() == TokenStatus.HOME) {
                moveOutOfHome(game, playerTokens, token, tokenIndex, playerIndex, dice);
            } else {
                moveOnTrack(game, playerTokens, token, tokenIndex, playerIndex, dice);
            }

            checkWin(game, playerIndex);

            game.setDiceValue(0);
            if (game.getStatus() != GameStatus.FINISHED) {
                if (dice == 6) {
                    // Rolling a 6 grants the same player another roll — currentPlayerIndex unchanged.
                } else {
                    nextTurn(game);
                }
            }
            repo.save(game);
            return game;
        } finally {
            lock.unlock();
        }
    }

    /** HOME -> ACTIVE: only legal on a roll of exactly 6, and only onto an unblocked start square. */
    private void moveOutOfHome(Game game, List<Token> playerTokens, Token token, int tokenIndex, int playerIndex, int dice) {
        if (dice != 6) {
            throw new InvalidMoveException("Need a roll of exactly 6 to move token " + tokenIndex + " out of home");
        }
        int startPos = Game.START_POSITIONS[playerIndex];
        if (isBlockedByOwnToken(playerTokens, startPos, tokenIndex)) {
            throw new InvalidMoveException("Start square is blocked by your own token");
        }
        token.transitionTo(TokenStatus.ACTIVE);
        token.setPosition(startPos);
        captureAtPosition(game, startPos, playerIndex);
    }

    /**
     * ACTIVE token advancing on the shared track. Exact-count rule: a roll that would carry the
     * token past its home cell is rejected outright (no-op — the board is left unchanged and the
     * player may retry with a different token) rather than wrapping the token around for another
     * lap, which is the overshoot bug fixed in RCA-020.
     */
    private void moveOnTrack(Game game, List<Token> playerTokens, Token token, int tokenIndex, int playerIndex, int dice) {
        int steps = stepsToHome(token, playerIndex);
        if (dice > steps) {
            throw new InvalidMoveException(
                    "Token " + tokenIndex + " needs exactly " + steps + " to reach home — rolled " + dice
                            + " (overshoot rejected, token unmoved)");
        }
        boolean finishing = dice == steps;
        int newPos = (token.getPosition() + dice) % Game.TRACK_SIZE;
        if (!finishing && isBlockedByOwnToken(playerTokens, newPos, tokenIndex)) {
            throw new InvalidMoveException("Square " + newPos + " is blocked by your own token");
        }
        token.setPosition(newPos);
        if (finishing) {
            token.transitionTo(TokenStatus.FINISHED);
        }
        captureAtPosition(game, newPos, playerIndex);
    }

    /** Track cells remaining until {@code token} reaches its color's home cell (0 once already there). */
    private int stepsToHome(Token token, int playerIndex) {
        int end = Game.endPosition(playerIndex);
        return (end - token.getPosition() + Game.TRACK_SIZE) % Game.TRACK_SIZE;
    }

    private boolean isBlockedByOwnToken(List<Token> playerTokens, int position, int excludeIndex) {
        for (int i = 0; i < playerTokens.size(); i++) {
            if (i == excludeIndex) continue;
            Token t = playerTokens.get(i);
            if (t.getStatus() == TokenStatus.ACTIVE && t.getPosition() == position) return true;
        }
        return false;
    }

    /** Sends every non-safe opposing ACTIVE token at {@code position} back HOME. */
    private void captureAtPosition(Game game, int position, int movingPlayerIndex) {
        if (isSafeSpot(position)) return;
        for (int pi = 0; pi < Game.PLAYER_COUNT; pi++) {
            if (pi == movingPlayerIndex) continue;
            for (Token t : game.getTokens().get(pi)) {
                if (t.getStatus() == TokenStatus.ACTIVE && t.getPosition() == position) {
                    t.transitionTo(TokenStatus.HOME);
                    t.setPosition(-1);
                }
            }
        }
    }

    private boolean isSafeSpot(int position) {
        for (int s : Game.SAFE_SPOTS) {
            if (s == position) return true;
        }
        return false;
    }

    private void checkWin(Game game, int playerIndex) {
        long finished = game.getTokens().get(playerIndex).stream()
                .filter(t -> t.getStatus() == TokenStatus.FINISHED)
                .count();
        if (finished == Game.TOKENS_PER_PLAYER) {
            game.setStatus(GameStatus.FINISHED);
            game.setWinner(game.getPlayers().get(playerIndex).getName());
        }
    }

    /**
     * True if the current player has at least one token that can legally move on this roll —
     * mirrors {@link #moveOutOfHome}/{@link #moveOnTrack}'s exact legality rules (including the
     * own-token block check) so {@link #doRoll} never auto-passes a turn that actually had a
     * legal move, nor leaves a turn stuck claiming a move exists when every attempt would be
     * rejected (RCA-022).
     */
    private boolean hasAnyLegalMove(Game game, int playerIndex, int dice) {
        List<Token> tokens = game.getTokens().get(playerIndex);
        int startPos = Game.START_POSITIONS[playerIndex];
        for (int i = 0; i < tokens.size(); i++) {
            Token t = tokens.get(i);
            if (t.getStatus() == TokenStatus.FINISHED) continue;
            if (t.getStatus() == TokenStatus.HOME) {
                if (dice == 6 && !isBlockedByOwnToken(tokens, startPos, i)) return true;
            } else {
                int steps = stepsToHome(t, playerIndex);
                if (dice > steps) continue;
                if (dice == steps) return true;
                int newPos = (t.getPosition() + dice) % Game.TRACK_SIZE;
                if (!isBlockedByOwnToken(tokens, newPos, i)) return true;
            }
        }
        return false;
    }

    private void nextTurn(Game game) {
        game.setCurrentPlayerIndex((game.getCurrentPlayerIndex() + 1) % Game.PLAYER_COUNT);
        game.setDiceValue(0);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/ludo/sim/*)
    // =========================================================================

    public Game simReset() {
        Game game = newGame(simRepository, SIM_PLAYER_NAMES);
        simGameId = game.getId();
        simEventLog.clear();
        simEventIdGen.set(1);
        logSimEvent(game, "system", "Simulation reset — new 4-player game, every token HOME.", 0);
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
        Game before = simRepository.get(simGameId);
        String actor = before.getPlayers().get(before.getCurrentPlayerIndex()).getName();
        RollOutcome outcome = doRoll(simRepository, simLocks, simGameId);
        String desc = outcome.turnPassed()
                ? actor + " rolled a " + outcome.rolledValue() + " but had no legal move — turn passed."
                : actor + " rolled a " + outcome.rolledValue() + ".";
        logSimEvent(outcome.game(), actor, desc, outcome.rolledValue());
        return outcome.game();
    }

    public Game simMove(int playerIndex, int tokenIndex) {
        if (simGameId == null) simReset();
        Game before = simRepository.get(simGameId);
        String actor = before.getPlayers().get(playerIndex).getName();
        int homeBefore = countOpponentsHome(before, playerIndex);

        Game game = doMove(simRepository, simLocks, simGameId, playerIndex, tokenIndex);

        Token moved = game.getTokens().get(playerIndex).get(tokenIndex);
        StringBuilder desc = new StringBuilder(actor).append(" moved token ").append(tokenIndex);
        if (moved.getStatus() == TokenStatus.FINISHED) {
            desc.append(" — reached home!");
        } else {
            desc.append(" to square ").append(moved.getPosition());
        }
        int captured = countOpponentsHome(game, playerIndex) - homeBefore;
        if (captured > 0) {
            desc.append(" and captured ").append(captured).append(" opponent token(s)!");
        }
        if (game.getStatus() == GameStatus.FINISHED) {
            desc.append(" ").append(game.getWinner()).append(" wins the game!");
        }
        logSimEvent(game, actor, desc.toString(), game.getDiceValue());
        return game;
    }

    private int countOpponentsHome(Game game, int excludePlayerIndex) {
        int count = 0;
        for (int pi = 0; pi < Game.PLAYER_COUNT; pi++) {
            if (pi == excludePlayerIndex) continue;
            for (Token t : game.getTokens().get(pi)) {
                if (t.getStatus() == TokenStatus.HOME) count++;
            }
        }
        return count;
    }

    private void logSimEvent(Game game, String actor, String description, int diceValue) {
        List<List<Token>> snapshot = new ArrayList<>();
        for (List<Token> playerTokens : game.getTokens()) {
            List<Token> copy = new ArrayList<>();
            for (Token t : playerTokens) {
                copy.add(Token.builder().id(t.getId()).color(t.getColor())
                        .position(t.getPosition()).status(t.getStatus()).build());
            }
            snapshot.add(copy);
        }
        simEventLog.add(SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(Instant.now().toString())
                .actor(actor)
                .description(description)
                .diceValue(diceValue)
                .tokensSnapshot(snapshot)
                .status(game.getStatus())
                .build());
    }
}

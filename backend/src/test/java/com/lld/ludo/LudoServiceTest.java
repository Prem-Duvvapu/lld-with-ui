package com.lld.ludo;

import com.lld.ludo.dice.FixedDiceRoller;
import com.lld.ludo.dice.RandomDiceRoller;
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
import com.lld.ludo.service.LudoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Service-level tests. This module's repository ({@code LudoRepository}) is a bare
 * {@code ConcurrentHashMap} id/save/get wrapper with no independent behaviour of its own (same
 * shape as {@code snakeladders.repository.GameRepository}) — its id generation and save/get
 * round-trip are exercised implicitly by every test here via {@code createGame}/{@code getGame},
 * so a separate repository test class would just duplicate these assertions; that coverage is
 * merged in here rather than skipped silently.
 *
 * <p>Board-rule tests that need a specific token layout (home-entry overshoot, captures, safe
 * spots, own-token blocking) mutate the {@link Game}/{@link Token} objects returned by
 * {@code getGame} directly rather than replaying dozens of turns to reach that layout —
 * {@link LudoRepository} stores games by reference, so the mutation is visible to the service on
 * the next call. Dice-driven tests ({@code rollDice}, extra-turn-on-six, auto-pass-on-no-move) go
 * through a {@link FixedDiceRoller} instead, so the exact roll sequence is deterministic.
 */
class LudoServiceTest {

    private static final List<String> NAMES = List.of("Alice", "Bob", "Charlie", "Diana");

    private LudoService serviceWith(int... rolls) {
        return new LudoService(new LudoRepository(), new FixedDiceRoller(rolls));
    }

    private Token tokenAt(Game game, int player, int idx) {
        return game.getTokens().get(player).get(idx);
    }

    // =========================================================================
    // CREATE GAME / PLAYER COUNT VALIDATION (repository coverage merged in here)
    // =========================================================================

    @Test
    @DisplayName("createGame builds 4 players with 4 HOME tokens each")
    void createGame_buildsFourPlayersFourTokens() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);

        assertEquals(4, game.getPlayers().size());
        assertEquals(GameStatus.PLAYING, game.getStatus());
        assertEquals(0, game.getCurrentPlayerIndex());
        assertEquals(0, game.getDiceValue());
        for (int p = 0; p < 4; p++) {
            assertEquals(NAMES.get(p), game.getPlayers().get(p).getName());
            assertEquals(4, game.getTokens().get(p).size());
            for (Token t : game.getTokens().get(p)) {
                assertEquals(TokenStatus.HOME, t.getStatus());
                assertEquals(-1, t.getPosition());
            }
        }
    }

    @Test
    @DisplayName("createGame rejects anything other than exactly 4 names")
    void createGame_rejectsWrongPlayerCount() {
        LudoService service = serviceWith(1);
        assertThrows(InvalidPlayerCountException.class, () -> service.createGame(List.of("A", "B", "C")));
        assertThrows(InvalidPlayerCountException.class, () -> service.createGame(List.of("A", "B", "C", "D", "E")));
        assertThrows(InvalidPlayerCountException.class, () -> service.createGame(List.of()));
        assertThrows(InvalidPlayerCountException.class, () -> service.createGame(null));
    }

    @Test
    @DisplayName("createGame rejects blank player names")
    void createGame_rejectsBlankNames() {
        LudoService service = serviceWith(1);
        assertThrows(InvalidPlayerCountException.class,
                () -> service.createGame(Arrays.asList("Alice", " ", "Charlie", "Diana")));
        assertThrows(InvalidPlayerCountException.class,
                () -> service.createGame(Arrays.asList("Alice", null, "Charlie", "Diana")));
    }

    @Test
    @DisplayName("repository assigns increasing ids and getGame round-trips the exact saved game")
    void repository_idGenerationAndRoundTrip() {
        LudoService service = serviceWith(1);
        Game g1 = service.createGame(NAMES);
        Game g2 = service.createGame(NAMES);
        assertNotEquals(g1.getId(), g2.getId());
        assertTrue(g2.getId() > g1.getId());

        Game fetched = service.getGame(g1.getId());
        assertEquals(g1.getId(), fetched.getId());
        assertEquals(g1.getPlayers().get(0).getName(), fetched.getPlayers().get(0).getName());
    }

    @Test
    @DisplayName("getGame on an unknown id throws GameNotFoundException")
    void getGame_notFound() {
        LudoService service = serviceWith(1);
        assertThrows(GameNotFoundException.class, () -> service.getGame(999L));
    }

    // =========================================================================
    // ROLL-SIX-TO-LEAVE-HOME
    // =========================================================================

    @Test
    @DisplayName("a HOME token cannot move without rolling exactly 6")
    void moveToken_homeTokenNeedsSix() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        game.setDiceValue(4);

        InvalidMoveException ex = assertThrows(InvalidMoveException.class,
                () -> service.moveToken(game.getId(), 0, 0));
        assertTrue(ex.getMessage().contains("6"));
        assertEquals(TokenStatus.HOME, tokenAt(game, 0, 0).getStatus());
    }

    @Test
    @DisplayName("a HOME token leaves home on exactly 6 and lands on its start square")
    void moveToken_homeTokenLeavesOnSix() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        game.setDiceValue(6);

        Game result = service.moveToken(game.getId(), 0, 0);

        Token token = tokenAt(result, 0, 0);
        assertEquals(TokenStatus.ACTIVE, token.getStatus());
        assertEquals(Game.START_POSITIONS[0], token.getPosition());
    }

    @Test
    @DisplayName("a FINISHED token can never move again, even with dice pending")
    void moveToken_finishedTokenRejected() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        tokenAt(game, 0, 0).setStatus(TokenStatus.FINISHED);
        tokenAt(game, 0, 0).setPosition(Game.endPosition(0));
        game.setDiceValue(3);

        assertThrows(InvalidMoveException.class, () -> service.moveToken(game.getId(), 0, 0));
    }

    @Test
    @DisplayName("leaving home is blocked when the start square already holds another own token")
    void moveToken_startSquareBlockedByOwnToken() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        tokenAt(game, 0, 1).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 1).setPosition(Game.START_POSITIONS[0]);
        game.setDiceValue(6);

        assertThrows(InvalidMoveException.class, () -> service.moveToken(game.getId(), 0, 0));
        assertEquals(TokenStatus.HOME, tokenAt(game, 0, 0).getStatus());
    }

    // =========================================================================
    // EXACT-COUNT HOME ENTRY
    // =========================================================================

    @Test
    @DisplayName("overshooting the home cell is rejected outright and leaves the token unmoved")
    void moveToken_overshootHomeRejected() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        // Player 0's home cell is 51; steps remaining from 47 is 4 — a roll of 6 overshoots it.
        tokenAt(game, 0, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 0).setPosition(47);
        game.setDiceValue(6);

        InvalidMoveException ex = assertThrows(InvalidMoveException.class,
                () -> service.moveToken(game.getId(), 0, 0));
        assertTrue(ex.getMessage().toLowerCase().contains("overshoot") || ex.getMessage().contains("needs exactly"));
        assertEquals(TokenStatus.ACTIVE, tokenAt(game, 0, 0).getStatus());
        assertEquals(47, tokenAt(game, 0, 0).getPosition(), "a rejected overshoot must leave the token's position unchanged");
    }

    @Test
    @DisplayName("an exact roll lands a token on its home cell and marks it FINISHED")
    void moveToken_exactRollFinishesToken() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        tokenAt(game, 0, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 0).setPosition(47);
        game.setDiceValue(4); // exactly the 4 steps remaining to reach cell 51

        Game result = service.moveToken(game.getId(), 0, 0);

        Token token = tokenAt(result, 0, 0);
        assertEquals(TokenStatus.FINISHED, token.getStatus());
        assertEquals(Game.endPosition(0), token.getPosition());
    }

    @Test
    @DisplayName("winning requires all 4 of a player's tokens to reach FINISHED")
    void winCondition_allFourTokensFinished() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        for (int i = 0; i < 3; i++) {
            tokenAt(game, 0, i).setStatus(TokenStatus.FINISHED);
            tokenAt(game, 0, i).setPosition(Game.endPosition(0));
        }
        tokenAt(game, 0, 3).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 3).setPosition(47);
        game.setDiceValue(4);

        Game result = service.moveToken(game.getId(), 0, 3);

        assertEquals(GameStatus.FINISHED, result.getStatus());
        assertEquals("Alice", result.getWinner());
    }

    // =========================================================================
    // OWN-TOKEN BLOCKING ON THE TRACK
    // =========================================================================

    @Test
    @DisplayName("a normal advance onto a square held by another own ACTIVE token is rejected")
    void moveToken_ownTokenBlocksTrackSquare() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        tokenAt(game, 0, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 0).setPosition(10);
        tokenAt(game, 0, 1).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 1).setPosition(12);
        game.setDiceValue(2);

        assertThrows(InvalidMoveException.class, () -> service.moveToken(game.getId(), 0, 0));
        assertEquals(10, tokenAt(game, 0, 0).getPosition());
    }

    // =========================================================================
    // CAPTURES AND SAFE SQUARES
    // =========================================================================

    @Test
    @DisplayName("landing on an opponent's token on a non-safe square captures it back to HOME")
    void moveToken_capturesOpponentOnNonSafeSquare() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        assertFalse(isSafe(6));
        tokenAt(game, 1, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 1, 0).setPosition(6);
        tokenAt(game, 0, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 0).setPosition(4);
        game.setDiceValue(2);

        Game result = service.moveToken(game.getId(), 0, 0);

        assertEquals(6, tokenAt(result, 0, 0).getPosition());
        Token captured = tokenAt(result, 1, 0);
        assertEquals(TokenStatus.HOME, captured.getStatus());
        assertEquals(-1, captured.getPosition());
    }

    @Test
    @DisplayName("landing on an opponent's token on a safe square does not capture it")
    void moveToken_safeSquareBlocksCapture() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        assertTrue(isSafe(8));
        tokenAt(game, 1, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 1, 0).setPosition(8);
        tokenAt(game, 0, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(game, 0, 0).setPosition(6);
        game.setDiceValue(2);

        Game result = service.moveToken(game.getId(), 0, 0);

        assertEquals(8, tokenAt(result, 0, 0).getPosition());
        Token opponent = tokenAt(result, 1, 0);
        assertEquals(TokenStatus.ACTIVE, opponent.getStatus());
        assertEquals(8, opponent.getPosition());
    }

    private boolean isSafe(int position) {
        for (int s : Game.SAFE_SPOTS) if (s == position) return true;
        return false;
    }

    // =========================================================================
    // ROLL / MOVE CONTRACT + TURN ORDER + EXTRA TURN ON SIX
    // =========================================================================

    @Test
    @DisplayName("moveToken before any roll is rejected")
    void moveToken_beforeRollRejected() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        InvalidMoveException ex = assertThrows(InvalidMoveException.class,
                () -> service.moveToken(game.getId(), 0, 0));
        assertTrue(ex.getMessage().toLowerCase().contains("roll"));
    }

    @Test
    @DisplayName("rolling again before spending the current roll is rejected")
    void rollDice_alreadyRolledRejected() {
        LudoService service = serviceWith(6, 3);
        Game game = service.createGame(NAMES);
        Game afterFirstRoll = service.rollDice(game.getId());
        assertEquals(6, afterFirstRoll.getDiceValue());

        assertThrows(InvalidMoveException.class, () -> service.rollDice(game.getId()));
    }

    @Test
    @DisplayName("moving to a player other than the current one is rejected")
    void moveToken_notYourTurn() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        game.setDiceValue(6);

        assertThrows(NotYourTurnException.class, () -> service.moveToken(game.getId(), 1, 0));
    }

    @Test
    @DisplayName("rolling a non-6 with no active tokens and none available to leave home auto-passes the turn")
    void rollDice_autoPassesWhenNoLegalMove() {
        LudoService service = serviceWith(3);
        Game game = service.createGame(NAMES);
        // Fresh game: player 0's tokens are all HOME. A roll of 3 (not 6) leaves no legal move.
        Game result = service.rollDice(game.getId());

        assertEquals(0, result.getDiceValue());
        assertEquals(1, result.getCurrentPlayerIndex(), "turn must auto-pass to player 1");
    }

    @Test
    @DisplayName("rolling a 6 grants the same player another roll after moving")
    void rollingSix_grantsExtraTurn() {
        LudoService service = serviceWith(6, 3);
        Game game = service.createGame(NAMES);

        Game afterRoll = service.rollDice(game.getId());
        assertEquals(6, afterRoll.getDiceValue());
        assertEquals(0, afterRoll.getCurrentPlayerIndex());

        Game afterMove = service.moveToken(game.getId(), 0, 0);
        assertEquals(0, afterMove.getCurrentPlayerIndex(), "rolling a 6 keeps the turn with the same player");
        assertEquals(0, afterMove.getDiceValue());

        Game afterSecondRoll = service.rollDice(game.getId());
        assertEquals(3, afterSecondRoll.getDiceValue());
        assertEquals(0, afterSecondRoll.getCurrentPlayerIndex());

        Game afterSecondMove = service.moveToken(game.getId(), 0, 0);
        assertEquals(1, afterSecondMove.getCurrentPlayerIndex(), "a non-6 move passes the turn to player 1");
    }

    @Test
    @DisplayName("game-over rejects further rolls and moves")
    void gameOver_rejectsRollAndMove() {
        LudoService service = serviceWith(1);
        Game game = service.createGame(NAMES);
        game.setStatus(GameStatus.FINISHED);
        game.setWinner("Alice");

        assertThrows(GameOverException.class, () -> service.rollDice(game.getId()));
        game.setDiceValue(6);
        assertThrows(GameOverException.class, () -> service.moveToken(game.getId(), 0, 0));
    }

    @Test
    @DisplayName("rollDice values from RandomDiceRoller always land in [1,6]")
    void randomDiceRoller_isInRange() {
        RandomDiceRoller roller = new RandomDiceRoller();
        for (int i = 0; i < 200; i++) {
            int value = roller.roll();
            assertTrue(value >= 1 && value <= 6, "roll out of range: " + value);
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    @Test
    @DisplayName("simReset seeds a fresh 4-player game with every token HOME and logs a reset event")
    void sim_resetSeedsFreshGame() {
        LudoService service = serviceWith(6);
        Game sim = service.simReset();

        assertEquals(4, sim.getPlayers().size());
        assertEquals(List.of("Alice", "Bob", "Charlie", "Diana"),
                sim.getPlayers().stream().map(p -> p.getName()).toList());
        sim.getTokens().forEach(list -> list.forEach(t -> assertEquals(TokenStatus.HOME, t.getStatus())));

        List<SimEvent> log = service.simGetEventLog();
        assertEquals(1, log.size());
        assertEquals("system", log.get(0).getActor());
    }

    @Test
    @DisplayName("simGetGame auto-resets when no sim game exists yet")
    void sim_getGameAutoResets() {
        LudoService service = serviceWith(6);
        Game sim = service.simGetGame();
        assertNotNull(sim);
        assertEquals(GameStatus.PLAYING, sim.getStatus());
    }

    @Test
    @DisplayName("simRoll appends a telemetry event describing the roll")
    void sim_rollLogsEvent() {
        LudoService service = serviceWith(6);
        service.simReset();
        Game sim = service.simRoll();

        assertEquals(6, sim.getDiceValue());
        List<SimEvent> log = service.simGetEventLog();
        assertEquals(2, log.size());
        assertTrue(log.get(1).getDescription().contains("rolled"));
        assertEquals(6, log.get(1).getDiceValue());
    }

    @Test
    @DisplayName("simMove reports a capture in its telemetry description")
    void sim_moveLogsCapture() {
        LudoService service = serviceWith(6);
        Game sim = service.simReset();
        tokenAt(sim, 1, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(sim, 1, 0).setPosition(6);
        tokenAt(sim, 0, 0).setStatus(TokenStatus.ACTIVE);
        tokenAt(sim, 0, 0).setPosition(4);
        sim.setCurrentPlayerIndex(0);
        sim.setDiceValue(2);

        Game result = service.simMove(0, 0);

        assertEquals(TokenStatus.HOME, tokenAt(result, 1, 0).getStatus());
        List<SimEvent> log = service.simGetEventLog();
        SimEvent last = log.get(log.size() - 1);
        assertTrue(last.getDescription().contains("captured"), "expected a capture callout: " + last.getDescription());
    }

    @Test
    @DisplayName("the sim sandbox never touches a live game's state")
    void sim_isolatedFromLiveGame() {
        LudoService service = serviceWith(6);
        Game live = service.createGame(NAMES);
        service.simReset();
        service.simRoll();

        Game liveAfter = service.getGame(live.getId());
        assertEquals(0, liveAfter.getDiceValue(), "sim rolls must never mutate the live game");
        liveAfter.getTokens().forEach(list -> list.forEach(t -> assertEquals(TokenStatus.HOME, t.getStatus())));
    }
}

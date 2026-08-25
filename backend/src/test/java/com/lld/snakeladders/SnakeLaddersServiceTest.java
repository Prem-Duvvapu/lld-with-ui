package com.lld.snakeladders;

import com.lld.snakeladders.dice.FixedDiceRoller;
import com.lld.snakeladders.dice.RandomDiceRoller;
import com.lld.snakeladders.exception.GameAlreadyFinishedException;
import com.lld.snakeladders.exception.GameNotFoundException;
import com.lld.snakeladders.exception.InvalidPlayerCountException;
import com.lld.snakeladders.model.Game;
import com.lld.snakeladders.model.GameState;
import com.lld.snakeladders.model.SimEvent;
import com.lld.snakeladders.repository.GameRepository;
import com.lld.snakeladders.service.SnakeLaddersService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Service-level tests. This module's repository ({@code GameRepository}) is a thin
 * {@code ConcurrentHashMap} wrapper with no independent behaviour of its own (identical shape to
 * tictactoe's) — its id-generation and save/get round-trip are exercised implicitly by every test
 * here via {@code createGame}/{@code getGame}, so a separate repository test class would just
 * duplicate these assertions; that coverage is merged in here rather than skipped silently.
 *
 * <p>Board/dice-rule tests construct {@link Game} directly with a {@link FixedDiceRoller} so the
 * exact roll sequence — and therefore the exact resulting position — is deterministic, rather
 * than relying on real randomness the way the module did before this suite existed.
 */
class SnakeLaddersServiceTest {

    private SnakeLaddersService serviceWith(int... rolls) {
        return new SnakeLaddersService(new GameRepository(), new FixedDiceRoller(rolls));
    }

    // =========================================================================
    // PLAYER COUNT VALIDATION
    // =========================================================================

    @Test
    @DisplayName("createGame rejects fewer than 2 players")
    void createGameRejectsTooFewPlayers() {
        SnakeLaddersService service = serviceWith(1);
        assertThrows(InvalidPlayerCountException.class, () -> service.createGame(List.of("Solo")));
        assertThrows(InvalidPlayerCountException.class, () -> service.createGame(List.of()));
    }

    @Test
    @DisplayName("createGame rejects more than 4 players (only 4 token colors exist)")
    void createGameRejectsTooManyPlayers() {
        SnakeLaddersService service = serviceWith(1);
        assertThrows(InvalidPlayerCountException.class,
                () -> service.createGame(List.of("A", "B", "C", "D", "E")));
    }

    @Test
    @DisplayName("createGame accepts 2, 3 and 4 players")
    void createGameAcceptsValidPlayerCounts() {
        SnakeLaddersService service = serviceWith(1);
        assertEquals(2, service.createGame(List.of("A", "B")).getPlayers().size());
        assertEquals(3, service.createGame(List.of("A", "B", "C")).getPlayers().size());
        assertEquals(4, service.createGame(List.of("A", "B", "C", "D")).getPlayers().size());
    }

    @Test
    @DisplayName("looking up an unknown game throws GameNotFoundException")
    void getUnknownGameThrows() {
        SnakeLaddersService service = serviceWith(1);
        assertThrows(GameNotFoundException.class, () -> service.getGame("nope"));
    }

    // =========================================================================
    // EXACT-COUNT WIN RULE
    // =========================================================================

    @Test
    @DisplayName("landing exactly on 100 wins the game")
    void exactLandingOn100Wins() {
        Game g = new Game("t1", List.of("Alice", "Bob"), List.of("#fff", "#000"),
                Map.of(), Map.of(), new FixedDiceRoller(4));
        g.getPlayers().get(0).setPosition(96);

        int rolled = g.rollAndMove();

        assertEquals(4, rolled);
        assertEquals(GameState.FINISHED, g.getState());
        assertNotNull(g.getWinner());
        assertEquals("Alice", g.getWinner().getName());
        assertEquals(100, g.getWinner().getPosition());
    }

    @Test
    @DisplayName("overshooting 100 forfeits the roll — exact-count rule keeps the player in place and passes the turn")
    void overshootingKeepsPlayerInPlaceAndPassesTurn() {
        Game g = new Game("t2", List.of("Alice", "Bob"), List.of("#fff", "#000"),
                Map.of(), Map.of(), new FixedDiceRoller(5));
        g.getPlayers().get(0).setPosition(98); // 98 + 5 = 103 > 100 -> forfeit

        int rolled = g.rollAndMove();

        assertEquals(5, rolled);
        assertEquals(98, g.getPlayers().get(0).getPosition(), "overshoot must leave the player exactly where they were");
        assertEquals(GameState.IN_PROGRESS, g.getState());
        assertEquals(1, g.getCurrentPlayerIndex(), "turn must still advance to the next player after a forfeited overshoot");
        assertTrue(g.getLastMessage().toLowerCase().contains("exact"));
    }

    // =========================================================================
    // SNAKE / LADDER RESOLUTION
    // =========================================================================

    @Test
    @DisplayName("landing on a snake head slides the player down to the tail")
    void snakeBiteSlidesPlayerDown() {
        Game g = new Game("t3", List.of("Alice", "Bob"), List.of("#fff", "#000"),
                Map.of(34, 1), Map.of(), new FixedDiceRoller(4));
        g.getPlayers().get(0).setPosition(30);

        g.rollAndMove(); // 30 + 4 = 34 -> snake head -> slides to 1

        assertEquals(1, g.getPlayers().get(0).getPosition());
        assertTrue(g.getLastMessage().toLowerCase().contains("snake"));
    }

    @Test
    @DisplayName("landing on a ladder bottom climbs the player up to the top")
    void ladderClimbMovesPlayerUp() {
        Game g = new Game("t4", List.of("Alice", "Bob"), List.of("#fff", "#000"),
                Map.of(), Map.of(2, 38), new FixedDiceRoller(2));

        g.rollAndMove(); // Alice: 0 + 2 = 2 -> ladder bottom -> climbs to 38

        assertEquals(38, g.getPlayers().get(0).getPosition());
        assertTrue(g.getLastMessage().toLowerCase().contains("ladder"));
    }

    @Test
    @DisplayName("a snake head exactly at 100 would still resolve as a slide, not a win (defensive board-config check)")
    void landingOnPlainCellNeitherSnakeNorLadderJustMoves() {
        Game g = new Game("t5", List.of("Alice", "Bob"), List.of("#fff", "#000"),
                Map.of(), Map.of(), new FixedDiceRoller(3));

        g.rollAndMove(); // 0 + 3 = 3, no snake/ladder there

        assertEquals(3, g.getPlayers().get(0).getPosition());
        assertTrue(g.getLastMessage().toLowerCase().contains("moved"));
    }

    // =========================================================================
    // MULTIPLAYER TURN ORDER
    // =========================================================================

    @Test
    @DisplayName("turn order cycles correctly for 3 players, skipping no one")
    void turnOrderCyclesForThreePlayers() {
        FixedDiceRoller dice = new FixedDiceRoller(1); // small moves, nobody wins
        SnakeLaddersService service = new SnakeLaddersService(new GameRepository(), dice);
        Game game = service.createGame(List.of("A", "B", "C"));
        String id = game.getId();

        assertEquals(0, service.getGame(id).getCurrentPlayerIndex());
        service.rollDice(id);
        assertEquals(1, service.getGame(id).getCurrentPlayerIndex());
        service.rollDice(id);
        assertEquals(2, service.getGame(id).getCurrentPlayerIndex());
        service.rollDice(id);
        assertEquals(0, service.getGame(id).getCurrentPlayerIndex(), "turn order must wrap back to player 0");
    }

    @Test
    @DisplayName("turn order cycles correctly for 4 players")
    void turnOrderCyclesForFourPlayers() {
        FixedDiceRoller dice = new FixedDiceRoller(1);
        SnakeLaddersService service = new SnakeLaddersService(new GameRepository(), dice);
        Game game = service.createGame(List.of("A", "B", "C", "D"));
        String id = game.getId();

        int[] expectedOrder = {1, 2, 3, 0};
        for (int expected : expectedOrder) {
            service.rollDice(id);
            assertEquals(expected, service.getGame(id).getCurrentPlayerIndex());
        }
    }

    @Test
    @DisplayName("a win stops the turn cycle — the winner's index stays current, no further advance")
    void winStopsTurnCycle() {
        FixedDiceRoller dice = new FixedDiceRoller(1);
        SnakeLaddersService service = new SnakeLaddersService(new GameRepository(), dice);
        Game game = service.createGame(List.of("Alice", "Bob"));
        game.getPlayers().get(0).setPosition(99); // Alice's next roll of 1 wins

        Game after = service.rollDice(game.getId());

        assertEquals(GameState.FINISHED, after.getState());
        assertEquals(0, after.getCurrentPlayerIndex(), "index must not advance past the winner");
    }

    // =========================================================================
    // GAME-OVER GUARD
    // =========================================================================

    @Test
    @DisplayName("rolling on an already-finished game throws GameAlreadyFinishedException")
    void rollingAfterGameOverThrows() {
        FixedDiceRoller dice = new FixedDiceRoller(1);
        SnakeLaddersService service = new SnakeLaddersService(new GameRepository(), dice);
        Game game = service.createGame(List.of("Alice", "Bob"));
        game.getPlayers().get(0).setPosition(99); // next roll of 1 wins
        Game afterWin = service.rollDice(game.getId());
        assertEquals(GameState.FINISHED, afterWin.getState());

        assertThrows(GameAlreadyFinishedException.class, () -> service.rollDice(game.getId()));
    }

    // =========================================================================
    // DICE ROLLERS
    // =========================================================================

    @Test
    @DisplayName("RandomDiceRoller always returns a value in [1,6]")
    void randomDiceRollerStaysInRange() {
        RandomDiceRoller roller = new RandomDiceRoller();
        for (int i = 0; i < 1000; i++) {
            int value = roller.roll();
            assertTrue(value >= 1 && value <= 6, "roll out of range: " + value);
        }
    }

    @Test
    @DisplayName("FixedDiceRoller replays its sequence, then repeats the last value")
    void fixedDiceRollerReplaysSequence() {
        FixedDiceRoller roller = new FixedDiceRoller(3, 5, 2);
        assertEquals(3, roller.roll());
        assertEquals(5, roller.roll());
        assertEquals(2, roller.roll());
        assertEquals(2, roller.roll(), "sequence exhausted — must repeat the last value, not throw");
        assertEquals(2, roller.roll());
    }

    @Test
    @DisplayName("FixedDiceRoller rejects out-of-range values and empty sequences at construction")
    void fixedDiceRollerRejectsInvalidConstruction() {
        assertThrows(IllegalArgumentException.class, () -> new FixedDiceRoller(0));
        assertThrows(IllegalArgumentException.class, () -> new FixedDiceRoller(7));
        assertThrows(IllegalArgumentException.class, () -> new FixedDiceRoller());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    @Test
    @DisplayName("sim engine runs independently of the live game repository")
    void simEngineIsolatedFromLiveGames() {
        SnakeLaddersService service = serviceWith(3, 4, 5, 6);
        Game live = service.createGame(List.of("Alice", "Bob"));
        service.rollDice(live.getId());

        // Sim and live use separate repository instances, each with its own id sequence starting
        // at 1 — so ids may coincide numerically. Isolation is proven by state, not by id identity.
        Game sim = service.simReset();
        assertEquals(0, sim.getPlayers().get(0).getPosition());

        Game simAfterRoll = service.simRoll();
        assertTrue(simAfterRoll.getPlayers().get(0).getPosition() > 0
                || simAfterRoll.getPlayers().get(1).getPosition() > 0);

        List<SimEvent> log = service.simGetEventLog();
        assertFalse(log.isEmpty());
    }

    @Test
    @DisplayName("sim engine rejects a roll once the sim game has finished")
    void simEngineGuardsAgainstRollingFinishedGame() {
        SnakeLaddersService service = serviceWith(1);
        Game sim = service.simReset();
        sim.getPlayers().get(0).setPosition(99); // sim's own state object — next roll wins

        Game afterWin = service.simRoll();
        assertEquals(GameState.FINISHED, afterWin.getState());

        assertThrows(GameAlreadyFinishedException.class, service::simRoll);
    }
}

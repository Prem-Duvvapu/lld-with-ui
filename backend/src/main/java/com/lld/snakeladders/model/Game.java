package com.lld.snakeladders.model;

import com.lld.snakeladders.dice.DiceRoller;
import com.lld.snakeladders.dice.RandomDiceRoller;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
public class Game {
    /** Exact-count rule: a player must land ON 100 to win. Overshooting forfeits the roll. */
    public static final int BOARD_SIZE = 100;

    private final String id;
    private final List<Player> players;
    private int currentPlayerIndex;
    private final Map<Integer, Integer> snakes;
    private final Map<Integer, Integer> ladders;
    private final DiceRoller diceRoller;
    private GameState state;
    private Player winner;
    private int lastDiceValue;
    private String lastMessage;

    public Game(String id, List<String> playerNames, List<String> colors,
                Map<Integer, Integer> snakes, Map<Integer, Integer> ladders) {
        this(id, playerNames, colors, snakes, ladders, new RandomDiceRoller());
    }

    public Game(String id, List<String> playerNames, List<String> colors,
                Map<Integer, Integer> snakes, Map<Integer, Integer> ladders, DiceRoller diceRoller) {
        this.id = id;
        this.players = new ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            players.add(new Player(playerNames.get(i), colors.get(i)));
        }
        this.currentPlayerIndex = 0;
        this.snakes = snakes;
        this.ladders = ladders;
        this.diceRoller = diceRoller;
        this.state = GameState.IN_PROGRESS;
        this.lastDiceValue = 0;
        this.lastMessage = "Game started! " + players.get(0).getName() + "'s turn.";
    }

    public Player getCurrentPlayer() { return players.get(currentPlayerIndex); }

    /**
     * Rolls the die for the current player and applies the exact-count / snake / ladder rules.
     * Returns the die value rolled. The caller (service) is responsible for rejecting rolls once
     * {@link #state} is no longer {@link GameState#IN_PROGRESS} — this method still defends with
     * a {@code -1} sentinel so it is never silently wrong if called directly.
     */
    public int rollAndMove() {
        if (state != GameState.IN_PROGRESS) return -1;

        Player player = players.get(currentPlayerIndex);
        int dice = diceRoller.roll();
        lastDiceValue = dice;

        int newPos = player.getPosition() + dice;
        if (newPos > BOARD_SIZE) {
            // Exact-count rule: overshooting BOARD_SIZE forfeits the roll — the player stays put.
            lastMessage = player.getName() + " rolled " + dice + " but needs exact roll. Stay at " + player.getPosition();
            nextTurn();
            return dice;
        }

        if (snakes.containsKey(newPos)) {
            newPos = snakes.get(newPos);
            lastMessage = player.getName() + " rolled " + dice + " and got bitten by a snake! Slid to " + newPos;
        } else if (ladders.containsKey(newPos)) {
            newPos = ladders.get(newPos);
            lastMessage = player.getName() + " rolled " + dice + " and climbed a ladder! Jumped to " + newPos;
        } else {
            lastMessage = player.getName() + " rolled " + dice + " and moved to " + newPos;
        }

        player.setPosition(newPos);

        if (newPos == BOARD_SIZE) {
            state = GameState.FINISHED;
            winner = player;
            lastMessage = player.getName() + " wins the game!";
        } else {
            nextTurn();
        }

        return dice;
    }

    private void nextTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.size();
    }
}

package com.lld.snakeladders.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Game {
    private String id;
    private List<Player> players;
    private int currentPlayerIndex;
    private Map<Integer, Integer> snakes;
    private Map<Integer, Integer> ladders;
    private GameState state;
    private Player winner;
    private int lastDiceValue;
    private String lastMessage;

    public Game(String id, List<String> playerNames, List<String> colors,
                Map<Integer, Integer> snakes, Map<Integer, Integer> ladders) {
        this.id = id;
        this.players = new ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            players.add(new Player(playerNames.get(i), colors.get(i)));
        }
        this.currentPlayerIndex = 0;
        this.snakes = snakes;
        this.ladders = ladders;
        this.state = GameState.IN_PROGRESS;
        this.lastDiceValue = 0;
        this.lastMessage = "Game started! " + players.get(0).getName() + "'s turn.";
    }

    public String getId() { return id; }
    public List<Player> getPlayers() { return players; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public Player getCurrentPlayer() { return players.get(currentPlayerIndex); }
    public Map<Integer, Integer> getSnakes() { return snakes; }
    public Map<Integer, Integer> getLadders() { return ladders; }
    public GameState getState() { return state; }
    public Player getWinner() { return winner; }
    public int getLastDiceValue() { return lastDiceValue; }
    public String getLastMessage() { return lastMessage; }

    public int rollAndMove() {
        if (state != GameState.IN_PROGRESS) return -1;

        Player player = players.get(currentPlayerIndex);
        int dice = Dice.roll();
        lastDiceValue = dice;

        int newPos = player.getPosition() + dice;
        if (newPos > 100) {
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

        if (newPos == 100) {
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

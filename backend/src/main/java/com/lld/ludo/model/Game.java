package com.lld.ludo.model;

import java.util.ArrayList;
import java.util.List;

public class Game {
    private long id;
    private List<Player> players;
    private List<List<Token>> tokens;
    private int currentPlayerIndex;
    private int diceValue;
    private GameStatus status;
    private String winner;

    public static final int[] START_POSITIONS = {0, 13, 26, 39};
    public static final int[] SAFE_SPOTS = {0, 8, 13, 21, 26, 34, 39, 47};
    public static final int TRACK_SIZE = 52;

    public Game() {}

    public Game(long id, String[] playerNames) {
        this.id = id;
        this.players = new ArrayList<>();
        this.tokens = new ArrayList<>();
        String[] colors = {"RED", "GREEN", "BLUE", "YELLOW"};
        for (int i = 0; i < 4; i++) {
            players.add(new Player(i, playerNames[i], colors[i]));
            List<Token> playerTokens = new ArrayList<>();
            for (int j = 0; j < 4; j++) {
                playerTokens.add(new Token(j, colors[i]));
            }
            tokens.add(playerTokens);
        }
        this.currentPlayerIndex = 0;
        this.diceValue = 0;
        this.status = GameStatus.PLAYING;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public List<Player> getPlayers() { return players; }
    public void setPlayers(List<Player> players) { this.players = players; }
    public List<List<Token>> getTokens() { return tokens; }
    public void setTokens(List<List<Token>> tokens) { this.tokens = tokens; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public void setCurrentPlayerIndex(int currentPlayerIndex) { this.currentPlayerIndex = currentPlayerIndex; }
    public int getDiceValue() { return diceValue; }
    public void setDiceValue(int diceValue) { this.diceValue = diceValue; }
    public GameStatus getStatus() { return status; }
    public void setStatus(GameStatus status) { this.status = status; }
    public String getWinner() { return winner; }
    public void setWinner(String winner) { this.winner = winner; }
}
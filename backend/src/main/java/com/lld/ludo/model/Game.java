package com.lld.ludo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * A single 4-player Ludo match: 4 {@link Player}s (fixed RED/GREEN/BLUE/YELLOW seats) and their
 * 4 {@link Token}s each, laid out on one shared 52-cell circular track. There is no separate
 * home-column lane in this simplified model — each color's "home entry" is the single track cell
 * one step behind its own start cell ({@code (START_POSITIONS[i] - 1 + TRACK_SIZE) % TRACK_SIZE}),
 * reached only by an exact-count roll (see {@code LudoService#stepsToHome}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Game {
    public static final int[] START_POSITIONS = {0, 13, 26, 39};
    public static final int[] SAFE_SPOTS = {0, 8, 13, 21, 26, 34, 39, 47};
    public static final int TRACK_SIZE = 52;
    public static final String[] COLORS = {"RED", "GREEN", "BLUE", "YELLOW"};
    public static final int PLAYER_COUNT = 4;
    public static final int TOKENS_PER_PLAYER = 4;

    private long id;
    private List<Player> players;
    private List<List<Token>> tokens;
    private int currentPlayerIndex;
    /** Last die value rolled and not yet spent on a move; 0 = no pending roll. */
    private int diceValue;
    private GameStatus status;
    private String winner;

    /** Builds a fresh 4-player game: each player's 4 tokens start HOME at position -1. */
    public static Game newGame(long id, List<String> playerNames) {
        List<Player> players = new ArrayList<>();
        List<List<Token>> tokens = new ArrayList<>();
        for (int i = 0; i < PLAYER_COUNT; i++) {
            players.add(Player.builder().index(i).name(playerNames.get(i)).color(COLORS[i]).build());
            List<Token> playerTokens = new ArrayList<>();
            for (int j = 0; j < TOKENS_PER_PLAYER; j++) {
                playerTokens.add(Token.newHomeToken(j, COLORS[i]));
            }
            tokens.add(playerTokens);
        }
        return Game.builder()
                .id(id)
                .players(players)
                .tokens(tokens)
                .currentPlayerIndex(0)
                .diceValue(0)
                .status(GameStatus.PLAYING)
                .build();
    }

    /** The single track cell that finishes {@code playerIndex}'s circuit — one behind their start. */
    public static int endPosition(int playerIndex) {
        return (START_POSITIONS[playerIndex] + TRACK_SIZE - 1) % TRACK_SIZE;
    }
}

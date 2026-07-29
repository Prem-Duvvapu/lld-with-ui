package com.lld.snakeladders.service;

import com.lld.snakeladders.model.Game;
import com.lld.snakeladders.repository.GameRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SnakeLaddersService {

    private final GameRepository repository;

    private static final Map<Integer, Integer> DEFAULT_SNAKES = Map.ofEntries(
            Map.entry(99, 54), Map.entry(95, 75), Map.entry(89, 25),
            Map.entry(62, 19), Map.entry(46, 5), Map.entry(34, 1)
    );

    private static final Map<Integer, Integer> DEFAULT_LADDERS = Map.ofEntries(
            Map.entry(2, 38), Map.entry(7, 14), Map.entry(8, 31), Map.entry(15, 26),
            Map.entry(21, 42), Map.entry(28, 84), Map.entry(36, 44), Map.entry(51, 67),
            Map.entry(71, 91), Map.entry(78, 98), Map.entry(87, 94)
    );

    public SnakeLaddersService(@Qualifier("snakeladdersGameRepository") GameRepository repository) {
        this.repository = repository;
    }

    public Game createGame(List<String> playerNames) {
        List<String> colors = List.of("#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4");
        String id = repository.generateId();
        Game game = new Game(id, playerNames, colors.subList(0, playerNames.size()),
                DEFAULT_SNAKES, DEFAULT_LADDERS);
        repository.save(game);
        return game;
    }

    public Game getGame(String id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found: " + id);
        return game;
    }

    public Game rollDice(String gameId) {
        Game game = getGame(gameId);
        game.rollAndMove();
        return game;
    }
}

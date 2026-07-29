package com.lld.tictactoe.repository;

import com.lld.tictactoe.model.Game;
import org.springframework.stereotype.Repository;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Repository("tictactoeGameRepository")
public class GameRepository {
    private final ConcurrentHashMap<String, Game> games = new ConcurrentHashMap<>();
    private final AtomicInteger counter = new AtomicInteger(0);

    public String generateId() {
        return "TTT-" + counter.incrementAndGet();
    }

    public void save(Game game) {
        games.put(game.getId(), game);
    }

    public Game get(String id) {
        return games.get(id);
    }
}

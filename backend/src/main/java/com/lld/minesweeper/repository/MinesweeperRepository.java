package com.lld.minesweeper.repository;

import com.lld.minesweeper.model.Game;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class MinesweeperRepository {
    private final Map<Long, Game> games = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    public long nextId() {
        return idGen.getAndIncrement();
    }

    public void save(Game game) {
        games.put(game.getId(), game);
    }

    public Game get(long id) {
        return games.get(id);
    }
}

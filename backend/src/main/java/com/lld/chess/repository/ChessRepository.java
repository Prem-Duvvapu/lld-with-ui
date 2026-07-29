package com.lld.chess.repository;

import com.lld.chess.model.Game;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository("chessGameRepository")
public class ChessRepository {
    private final Map<Long, Game> games = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    public long nextId() { return idGen.getAndIncrement(); }

    public void save(Game game) { games.put(game.getId(), game); }

    public Game get(long id) { return games.get(id); }
}
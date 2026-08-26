package com.lld.ludo.repository;

import com.lld.ludo.model.Game;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * A bare id/save/get wrapper with no independent behaviour of its own — same shape as
 * {@code snakeladders.repository.GameRepository} and {@code minesweeper.repository.MinesweeperRepository}.
 * Its id-generation and save/get round-trip are exercised implicitly by every {@code LudoServiceTest}
 * case via {@code createGame}/{@code getGame}, so there is no separate repository test class; that
 * coverage is merged into the service test rather than duplicated (see {@code MinesweeperService}'s
 * AGENTS.md note for the same call on that module).
 */
@Repository("ludoGameRepository")
public class LudoRepository {
    private final Map<Long, Game> games = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    public long nextId() { return idGen.getAndIncrement(); }
    public void save(Game game) { games.put(game.getId(), game); }
    public Game get(long id) { return games.get(id); }
}

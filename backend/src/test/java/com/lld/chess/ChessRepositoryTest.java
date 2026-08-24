package com.lld.chess;

import com.lld.chess.model.Color;
import com.lld.chess.model.Game;
import com.lld.chess.model.Player;
import com.lld.chess.repository.ChessRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Chess Repository")
class ChessRepositoryTest {

    @Test
    @DisplayName("nextId hands out strictly increasing, unique ids")
    void nextIdIncrements() {
        ChessRepository repository = new ChessRepository();
        long first = repository.nextId();
        long second = repository.nextId();
        assertEquals(first + 1, second);
    }

    @Test
    @DisplayName("save then get round-trips the same game")
    void saveAndGetRoundTrip() {
        ChessRepository repository = new ChessRepository();
        Game game = new Game(1, new Player(1, "Alice", Color.WHITE), new Player(2, "Bob", Color.BLACK));
        repository.save(game);
        assertSame(game, repository.get(1));
    }

    @Test
    @DisplayName("An unknown id returns null rather than throwing")
    void unknownIdReturnsNull() {
        ChessRepository repository = new ChessRepository();
        assertNull(repository.get(42));
    }
}

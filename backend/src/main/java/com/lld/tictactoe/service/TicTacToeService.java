package com.lld.tictactoe.service;

import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.Player;
import com.lld.tictactoe.repository.GameRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class TicTacToeService {

    private final GameRepository repository;

    public TicTacToeService(@Qualifier("tictactoeGameRepository") GameRepository repository) {
        this.repository = repository;
    }

    public Game createGame(String player1, String player2) {
        String id = repository.generateId();
        Game game = new Game(id, player1, player2);
        repository.save(game);
        return game;
    }

    public Game getGame(String id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found: " + id);
        return game;
    }

    public Game makeMove(String gameId, int row, int col, String playerName) {
        Game game = getGame(gameId);
        Player player = game.getCurrentTurn();
        if (!player.getName().equals(playerName)) {
            throw new IllegalStateException("Not your turn");
        }
        boolean success = game.makeMove(row, col, player);
        if (!success) {
            throw new IllegalStateException("Invalid move");
        }
        return game;
    }

    public Game resetGame(String gameId) {
        Game game = getGame(gameId);
        game.reset();
        return game;
    }
}

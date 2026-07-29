package com.lld.ludo.service;

import com.lld.ludo.model.Game;
import com.lld.ludo.model.GameStatus;
import com.lld.ludo.model.Token;
import com.lld.ludo.repository.LudoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class LudoService {
    private final LudoRepository repository;
    private final ReentrantLock lock = new ReentrantLock();
    private final Random random = new Random();

    public LudoService(LudoRepository repository) {
        this.repository = repository;
    }

    public Game createGame(String[] playerNames) {
        lock.lock();
        try {
            long id = repository.nextId();
            Game game = new Game(id, playerNames);
            repository.save(game);
            return game;
        } finally {
            lock.unlock();
        }
    }

    public Game getGame(long id) {
        Game game = repository.get(id);
        if (game == null) throw new IllegalArgumentException("Game not found: " + id);
        return game;
    }

    public Game rollDice(long gameId) {
        lock.lock();
        try {
            Game game = getGame(gameId);
            if (game.getStatus() != GameStatus.PLAYING) throw new IllegalStateException("Game is over");

            int dice = random.nextInt(6) + 1;
            game.setDiceValue(dice);

            boolean hasAvailableMove = hasAnyMove(game, game.getCurrentPlayerIndex(), dice);
            if (!hasAvailableMove) {
                nextTurn(game);
            }

            return game;
        } finally {
            lock.unlock();
        }
    }

    public Game moveToken(long gameId, int playerIndex, int tokenIndex) {
        lock.lock();
        try {
            Game game = getGame(gameId);
            if (game.getStatus() != GameStatus.PLAYING) throw new IllegalStateException("Game is over");
            if (game.getCurrentPlayerIndex() != playerIndex) throw new IllegalStateException("Not your turn");

            int dice = game.getDiceValue();
            if (dice == 0) throw new IllegalStateException("Roll dice first");

            List<Token> playerTokens = game.getTokens().get(playerIndex);
            Token token = playerTokens.get(tokenIndex);

            if (token.isFinished()) throw new IllegalStateException("Token already finished");

            if (token.isHome()) {
                if (dice == 6) {
                    int startPos = Game.START_POSITIONS[playerIndex];
                    for (int i = 0; i < playerTokens.size(); i++) {
                        Token t = playerTokens.get(i);
                        if (!t.isHome() && !t.isFinished() && t.getPosition() == startPos) {
                            throw new IllegalStateException("Start position occupied by own token");
                        }
                    }
                    captureAtPosition(game, startPos, playerIndex);
                    token.setHome(false);
                    token.setPosition(startPos);
                } else {
                    throw new IllegalStateException("Need a 6 to leave home");
                }
            } else {
                int newPos = (token.getPosition() + dice) % Game.TRACK_SIZE;
                for (int i = 0; i < playerTokens.size(); i++) {
                    Token t = playerTokens.get(i);
                    if (i != tokenIndex && !t.isHome() && !t.isFinished() && t.getPosition() == newPos) {
                        throw new IllegalStateException("Position occupied by own token");
                    }
                }
                captureAtPosition(game, newPos, playerIndex);
                token.setPosition(newPos);
                checkFinished(token, playerIndex, game);
            }

            game.setDiceValue(0);

            if (game.getStatus() != GameStatus.FINISHED) {
                if (dice != 6) {
                    nextTurn(game);
                }
            }

            return game;
        } finally {
            lock.unlock();
        }
    }

    private void captureAtPosition(Game game, int position, int playerIndex) {
        if (isSafeSpot(position)) return;
        for (int pi = 0; pi < 4; pi++) {
            if (pi == playerIndex) continue;
            List<Token> oppTokens = game.getTokens().get(pi);
            for (Token t : oppTokens) {
                if (!t.isHome() && !t.isFinished() && t.getPosition() == position) {
                    t.setHome(true);
                    t.setPosition(-1);
                }
            }
        }
    }

    private boolean isSafeSpot(int position) {
        for (int s : Game.SAFE_SPOTS) {
            if (s == position) return true;
        }
        return false;
    }

    private void checkFinished(Token token, int playerIndex, Game game) {
        int startPos = Game.START_POSITIONS[playerIndex];
        int endPos = (startPos + Game.TRACK_SIZE - 1) % Game.TRACK_SIZE;

        if (token.getPosition() == endPos) {
            token.setFinished(true);
        }

        int finished = 0;
        for (Token t : game.getTokens().get(playerIndex)) {
            if (t.isFinished()) finished++;
        }
        if (finished == 4) {
            game.setStatus(GameStatus.FINISHED);
            game.setWinner(game.getPlayers().get(playerIndex).getName());
        }
    }

    private boolean hasAnyMove(Game game, int playerIndex, int dice) {
        List<Token> tokens = game.getTokens().get(playerIndex);
        if (dice == 6) {
            boolean anyHome = tokens.stream().anyMatch(Token::isHome);
            if (anyHome) return true;
        }
        int startPos = Game.START_POSITIONS[playerIndex];
        for (Token t : tokens) {
            if (t.isFinished()) continue;
            if (t.isHome()) {
                if (dice == 6) return true;
            } else {
                int newPos = (t.getPosition() + dice) % Game.TRACK_SIZE;
                boolean occupied = false;
                for (Token own : tokens) {
                    if (own != t && !own.isHome() && !own.isFinished() && own.getPosition() == newPos) {
                        occupied = true;
                        break;
                    }
                }
                if (!occupied) return true;
            }
        }
        return false;
    }

    private void nextTurn(Game game) {
        int next = (game.getCurrentPlayerIndex() + 1) % 4;
        game.setCurrentPlayerIndex(next);
        game.setDiceValue(0);
    }

    public int rollDiceValue() {
        return random.nextInt(6) + 1;
    }
}
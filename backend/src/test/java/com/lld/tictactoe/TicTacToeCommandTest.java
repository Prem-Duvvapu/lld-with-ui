package com.lld.tictactoe;

import com.lld.tictactoe.command.GameCommand;
import com.lld.tictactoe.command.PlaceMoveCommand;
import com.lld.tictactoe.command.ResetGameCommand;
import com.lld.tictactoe.command.UndoMoveCommand;
import com.lld.tictactoe.exception.CellOccupiedException;
import com.lld.tictactoe.exception.InvalidMoveException;
import com.lld.tictactoe.exception.NotYourTurnException;
import com.lld.tictactoe.model.Game;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Tic Tac Toe Command pattern")
class TicTacToeCommandTest {

    @Test
    @DisplayName("PlaceMoveCommand owns validation and move execution")
    void placeMoveOwnsValidationAndExecution() {
        Game game = new Game("TTT-CMD-1", "Alice", "Bob");

        PlaceMoveCommand command = new PlaceMoveCommand(game, 0, 0, "Alice");
        Game updated = command.execute();

        assertEquals("X", updated.getBoard()[0][0]);
        assertEquals(1, updated.getMoveCount());
        assertEquals("Bob", updated.getCurrentTurn().getName());
        assertTrue(command.isExecuted());
        assertThrows(InvalidMoveException.class, command::execute);
    }

    @Test
    @DisplayName("PlaceMoveCommand preserves the typed validation contract")
    void placeMovePreservesTypedValidation() {
        Game game = new Game("TTT-CMD-2", "Alice", "Bob");

        assertThrows(InvalidMoveException.class,
                () -> new PlaceMoveCommand(game, 3, 0, "Alice").execute());
        assertThrows(NotYourTurnException.class,
                () -> new PlaceMoveCommand(game, 0, 0, "Bob").execute());

        new PlaceMoveCommand(game, 0, 0, "Alice").execute();
        assertThrows(CellOccupiedException.class,
                () -> new PlaceMoveCommand(game, 0, 0, "Bob").execute());
    }

    @Test
    @DisplayName("UndoMoveCommand invokes the exact PlaceMoveCommand reversal")
    void undoMoveReversesTheTargetCommand() {
        Game game = new Game("TTT-CMD-3", "Alice", "Bob");
        PlaceMoveCommand place = new PlaceMoveCommand(game, 1, 1, "Alice");
        place.execute();

        UndoMoveCommand undo = new UndoMoveCommand(place);
        Game updated = undo.execute();

        assertEquals("", updated.getBoard()[1][1]);
        assertEquals(0, updated.getMoveCount());
        assertEquals("Alice", updated.getCurrentTurn().getName());
        assertFalse(place.isExecuted());
        assertTrue(undo.wasUndone());
    }

    @Test
    @DisplayName("Move commands enforce reverse execution order")
    void moveCommandsMustUndoInLifoOrder() {
        Game game = new Game("TTT-CMD-4", "Alice", "Bob");
        PlaceMoveCommand first = new PlaceMoveCommand(game, 0, 0, "Alice");
        PlaceMoveCommand second = new PlaceMoveCommand(game, 1, 1, "Bob");
        first.execute();
        second.execute();

        assertThrows(IllegalStateException.class, first::undo);
        new UndoMoveCommand(second).execute();
        new UndoMoveCommand(first).execute();

        assertEquals(0, game.getMoveCount());
        assertEquals("", game.getBoard()[0][0]);
        assertEquals("", game.getBoard()[1][1]);
    }

    @Test
    @DisplayName("All command implementations execute through GameCommand")
    void allImplementationsExecutePolymorphically() {
        Game game = new Game("TTT-CMD-5", "Alice", "Bob");
        PlaceMoveCommand place = new PlaceMoveCommand(game, 2, 2, "Alice");

        GameCommand[] commands = {
                place,
                new UndoMoveCommand(place),
                new ResetGameCommand(game)
        };
        for (GameCommand command : commands) {
            command.execute();
        }

        assertEquals(0, game.getMoveCount());
        assertEquals("", game.getBoard()[2][2]);
        assertEquals("Alice", game.getCurrentTurn().getName());
    }
}

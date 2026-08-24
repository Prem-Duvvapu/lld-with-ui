package com.lld.chess;

import com.lld.chess.command.ApplyMoveCommand;
import com.lld.chess.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ApplyMoveCommand — execute/undo round-trips")
class ApplyMoveCommandTest {

    private Game game(long id) {
        return new Game(id, new Player(1, "Alice", Color.WHITE), new Player(2, "Bob", Color.BLACK));
    }

    @Test
    @DisplayName("A plain move is fully reversible")
    void plainMoveUndoes() {
        Game game = game(1);
        Piece[][] before = deepCopy(game.getBoard());

        ApplyMoveCommand cmd = new ApplyMoveCommand(game, 6, 4, 4, 4, null);
        cmd.execute();
        assertNull(game.getBoard()[6][4]);
        assertNotNull(game.getBoard()[4][4]);
        cmd.undo();
        assertBoardsEqual(before, game.getBoard());
        assertTrue(game.getMoveHistory().isEmpty());
    }

    @Test
    @DisplayName("Castling undo restores both the king and the rook")
    void castlingUndoes() {
        Game game = game(1);
        game.getBoard()[7][5] = null;
        game.getBoard()[7][6] = null;
        Piece[][] before = deepCopy(game.getBoard());

        ApplyMoveCommand cmd = new ApplyMoveCommand(game, 7, 4, 7, 6, null);
        cmd.execute();
        assertEquals(Piece.of(Color.WHITE, PieceType.KING), game.getBoard()[7][6]);
        cmd.undo();

        assertBoardsEqual(before, game.getBoard());
        assertFalse(game.getKingMoved()[0]);
    }

    @Test
    @DisplayName("En passant undo restores the captured pawn to its actual square")
    void enPassantUndoes() {
        Game game = game(1);
        for (Piece[] row : game.getBoard()) Arrays.fill(row, null);
        game.getBoard()[3][4] = Piece.of(Color.WHITE, PieceType.PAWN);
        game.getBoard()[3][3] = Piece.of(Color.BLACK, PieceType.PAWN);
        game.setEnPassantTarget(new int[]{2, 3});
        Piece[][] before = deepCopy(game.getBoard());

        ApplyMoveCommand cmd = new ApplyMoveCommand(game, 3, 4, 2, 3, null);
        cmd.execute();
        assertNull(game.getBoard()[3][3], "captured pawn removed");
        cmd.undo();

        assertBoardsEqual(before, game.getBoard());
    }

    @Test
    @DisplayName("Promotion undo restores the original pawn, not the promoted piece")
    void promotionUndoes() {
        Game game = game(1);
        for (Piece[] row : game.getBoard()) Arrays.fill(row, null);
        game.getBoard()[1][0] = Piece.of(Color.WHITE, PieceType.PAWN);
        Piece[][] before = deepCopy(game.getBoard());

        ApplyMoveCommand cmd = new ApplyMoveCommand(game, 1, 0, 0, 0, PieceType.QUEEN);
        cmd.execute();
        assertEquals(Piece.of(Color.WHITE, PieceType.QUEEN), game.getBoard()[0][0]);
        cmd.undo();

        assertBoardsEqual(before, game.getBoard());
        assertEquals(PieceType.PAWN, game.getBoard()[1][0].getType());
    }

    private static Piece[][] deepCopy(Piece[][] board) {
        Piece[][] copy = new Piece[8][8];
        for (int r = 0; r < 8; r++) copy[r] = Arrays.copyOf(board[r], 8);
        return copy;
    }

    private static void assertBoardsEqual(Piece[][] expected, Piece[][] actual) {
        for (int r = 0; r < 8; r++) {
            assertArrayEquals(expected[r], actual[r], "row " + r + " differs after undo");
        }
    }
}

package com.lld.chess;

import com.lld.chess.model.Color;
import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;
import com.lld.chess.strategy.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for each {@link PieceMoveStrategy} in isolation, with no {@code ChessService} or
 * check-safety involved — exactly the piece's own shape/path/special rules.
 */
@DisplayName("Chess Move Strategies — per-piece shape rules")
class ChessMoveStrategyTest {

    private static Piece[][] emptyBoard() {
        return new Piece[8][8];
    }

    private static final MoveContext NO_CONTEXT =
            new MoveContext(new boolean[2], new boolean[4], null, (b, r, c, color) -> false);

    @Test
    @DisplayName("Pawn: forward one, forward two from start row, diagonal capture, en passant")
    void pawnStrategy() {
        PawnMoveStrategy pawn = new PawnMoveStrategy();
        Piece[][] board = emptyBoard();
        board[6][4] = Piece.of(Color.WHITE, PieceType.PAWN);

        assertTrue(pawn.isValidMove(board, 6, 4, 5, 4, NO_CONTEXT));
        assertTrue(pawn.isValidMove(board, 6, 4, 4, 4, NO_CONTEXT));
        assertFalse(pawn.isValidMove(board, 6, 4, 3, 4, NO_CONTEXT)); // three squares

        board[5][3] = Piece.of(Color.BLACK, PieceType.PAWN);
        assertTrue(pawn.isValidMove(board, 6, 4, 5, 3, NO_CONTEXT)); // diagonal capture
        assertFalse(pawn.isValidMove(board, 6, 4, 5, 5, NO_CONTEXT)); // empty diagonal, no ep target

        MoveContext epContext = new MoveContext(new boolean[2], new boolean[4], new int[]{5, 5}, (b, r, c, cl) -> false);
        assertTrue(pawn.isValidMove(board, 6, 4, 5, 5, epContext)); // en-passant target matches

        assertTrue(pawn.attacksSquare(board, 6, 4, 5, 3));
        assertFalse(pawn.attacksSquare(board, 6, 4, 5, 4)); // pawn never "attacks" straight ahead
    }

    @Test
    @DisplayName("Rook: slides in straight lines, blocked by any piece in the path")
    void rookStrategy() {
        RookMoveStrategy rook = new RookMoveStrategy();
        Piece[][] board = emptyBoard();
        assertTrue(rook.isValidMove(board, 0, 0, 0, 7, NO_CONTEXT));
        assertFalse(rook.isValidMove(board, 0, 0, 7, 7, NO_CONTEXT)); // not a straight line

        board[0][4] = Piece.of(Color.WHITE, PieceType.PAWN);
        assertFalse(rook.isValidMove(board, 0, 0, 0, 7, NO_CONTEXT)); // blocked at d1... e1
    }

    @Test
    @DisplayName("Knight: L-shape only, ignores anything in between")
    void knightStrategy() {
        KnightMoveStrategy knight = new KnightMoveStrategy();
        Piece[][] board = emptyBoard();
        board[3][3] = Piece.of(Color.WHITE, PieceType.PAWN); // sits "in the way" — irrelevant to a knight
        assertTrue(knight.isValidMove(board, 2, 2, 4, 4, NO_CONTEXT));
        assertFalse(knight.isValidMove(board, 2, 2, 3, 3, NO_CONTEXT));
        assertFalse(knight.isValidMove(board, 2, 2, 4, 3, NO_CONTEXT));
    }

    @Test
    @DisplayName("Bishop: slides diagonally, blocked by any piece in the path")
    void bishopStrategy() {
        BishopMoveStrategy bishop = new BishopMoveStrategy();
        Piece[][] board = emptyBoard();
        assertTrue(bishop.isValidMove(board, 0, 0, 4, 4, NO_CONTEXT));
        assertFalse(bishop.isValidMove(board, 0, 0, 4, 3, NO_CONTEXT)); // not diagonal

        board[2][2] = Piece.of(Color.BLACK, PieceType.PAWN);
        assertFalse(bishop.isValidMove(board, 0, 0, 4, 4, NO_CONTEXT));
    }

    @Test
    @DisplayName("Queen: rook lines and bishop diagonals, nothing else")
    void queenStrategy() {
        QueenMoveStrategy queen = new QueenMoveStrategy();
        Piece[][] board = emptyBoard();
        assertTrue(queen.isValidMove(board, 4, 4, 4, 0, NO_CONTEXT));
        assertTrue(queen.isValidMove(board, 4, 4, 1, 1, NO_CONTEXT));
        assertFalse(queen.isValidMove(board, 4, 4, 2, 3, NO_CONTEXT));
    }

    @Test
    @DisplayName("King: one square any direction; two-square move only via castling rights")
    void kingStrategy() {
        KingMoveStrategy king = new KingMoveStrategy();
        Piece[][] board = emptyBoard();
        board[7][4] = Piece.of(Color.WHITE, PieceType.KING);
        board[7][7] = Piece.of(Color.WHITE, PieceType.ROOK);

        assertTrue(king.isValidMove(board, 7, 4, 7, 5, NO_CONTEXT));
        assertFalse(king.isValidMove(board, 7, 4, 5, 4, NO_CONTEXT)); // two squares straight, no rook there

        MoveContext castleOk = new MoveContext(new boolean[2], new boolean[4], null, (b, r, c, cl) -> false);
        assertTrue(king.isValidMove(board, 7, 4, 7, 6, castleOk));

        boolean[] kingMoved = {true, false};
        MoveContext kingAlreadyMoved = new MoveContext(kingMoved, new boolean[4], null, (b, r, c, cl) -> false);
        assertFalse(king.isValidMove(board, 7, 4, 7, 6, kingAlreadyMoved));
    }

    @Test
    @DisplayName("PieceMoveStrategyFactory resolves the right strategy for every piece type")
    void factoryResolvesEveryType() {
        PieceMoveStrategyFactory factory = new PieceMoveStrategyFactory(java.util.List.of(
                new PawnMoveStrategy(), new RookMoveStrategy(), new KnightMoveStrategy(),
                new BishopMoveStrategy(), new QueenMoveStrategy(), new KingMoveStrategy()));
        for (PieceType type : PieceType.values()) {
            assertEquals(type, factory.forType(type).type());
        }
    }
}

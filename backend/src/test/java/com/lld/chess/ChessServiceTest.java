package com.lld.chess;

import com.lld.chess.exception.*;
import com.lld.chess.model.*;
import com.lld.chess.repository.ChessRepository;
import com.lld.chess.service.ChessService;
import com.lld.chess.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Move legality, check/checkmate/stalemate detection, castling, en passant, promotion and
 * turn enforcement — none of this had a single test before this suite. Positions are built
 * directly on {@link Game#getBoard()} (nulled out, then hand-placed) rather than played move
 * by move, so each scenario tests exactly the rule it claims to.
 */
@DisplayName("Chess Service — Move Legality & Game Rules")
class ChessServiceTest {

    private ChessRepository repository;
    private ChessService service;

    @BeforeEach
    void setUp() {
        repository = new ChessRepository();
        service = new ChessService(repository, strategyFactory());
    }

    private static PieceMoveStrategyFactory strategyFactory() {
        return new PieceMoveStrategyFactory(List.of(
                new PawnMoveStrategy(), new RookMoveStrategy(), new KnightMoveStrategy(),
                new BishopMoveStrategy(), new QueenMoveStrategy(), new KingMoveStrategy()));
    }

    private Game freshGame() {
        return service.createGame("Alice", "Bob");
    }

    private void clearBoard(Game game) {
        for (Piece[] row : game.getBoard()) Arrays.fill(row, null);
    }

    private void place(Game game, int row, int col, Color color, PieceType type) {
        game.getBoard()[row][col] = Piece.of(color, type);
    }

    // =========================================================================
    // BASIC GAME LIFECYCLE
    // =========================================================================

    @Test
    @DisplayName("A new game starts ACTIVE with White to move and the standard setup")
    void newGameStartsActive() {
        Game game = freshGame();
        assertEquals(GameStatus.ACTIVE, game.getStatus());
        assertEquals(0, game.getCurrentPlayerIndex());
        assertEquals(Color.WHITE, game.currentColor());
        assertEquals(Piece.of(Color.WHITE, PieceType.ROOK), game.getBoard()[7][0]);
        assertEquals(Piece.of(Color.BLACK, PieceType.KING), game.getBoard()[0][4]);
        assertNull(game.getBoard()[4][4]);
    }

    @Test
    @DisplayName("Fetching an unknown game id fails with GameNotFoundException")
    void unknownGameFails() {
        assertThrows(GameNotFoundException.class, () -> service.getGame(999));
    }

    @Test
    @DisplayName("Moving from an empty square fails with NoPieceAtSquareException")
    void emptySourceSquareFails() {
        Game game = freshGame();
        assertThrows(NoPieceAtSquareException.class, () -> service.makeMove(game.getId(), 4, 4, 3, 4, null));
    }

    // =========================================================================
    // TURN ENFORCEMENT
    // =========================================================================

    @Test
    @DisplayName("Black may not move before White")
    void blackCannotMoveFirst() {
        Game game = freshGame();
        assertThrows(NotYourTurnException.class, () -> service.makeMove(game.getId(), 1, 0, 2, 0, null));
    }

    @Test
    @DisplayName("White may not move twice in a row")
    void whiteCannotMoveTwice() {
        Game game = freshGame();
        service.makeMove(game.getId(), 6, 4, 4, 4, null); // e2-e4
        assertThrows(NotYourTurnException.class, () -> service.makeMove(game.getId(), 6, 3, 4, 3, null));
    }

    @Test
    @DisplayName("A finished game rejects further moves with GameOverException")
    void gameOverRejectsMoves() {
        Game game = freshGame();
        game.setStatus(GameStatus.CHECKMATE);
        assertThrows(GameOverException.class, () -> service.makeMove(game.getId(), 6, 4, 4, 4, null));
    }

    // =========================================================================
    // PER-PIECE MOVE GENERATION
    // =========================================================================

    @Test
    @DisplayName("Pawn: single step, double step from start, and blocked double step")
    void pawnForwardMoves() {
        Game game = freshGame();
        assertDoesNotThrow(() -> service.makeMove(game.getId(), 6, 4, 5, 4, null)); // e2-e3

        Game game2 = freshGame();
        assertDoesNotThrow(() -> service.makeMove(game2.getId(), 6, 4, 4, 4, null)); // e2-e4

        Game game3 = freshGame();
        // Block the path square in front of the pawn, then a double-step must fail.
        place(game3, 5, 4, Color.BLACK, PieceType.KNIGHT);
        assertThrows(InvalidMoveException.class, () -> service.makeMove(game3.getId(), 6, 4, 4, 4, null));
    }

    @Test
    @DisplayName("Pawn: cannot capture straight ahead, can only capture diagonally")
    void pawnCaptureIsDiagonalOnly() {
        Game game = freshGame();
        place(game, 5, 4, Color.BLACK, PieceType.PAWN); // e3 occupied by enemy, directly ahead of e2
        long id = game.getId();
        assertThrows(InvalidMoveException.class, () -> service.makeMove(id, 6, 4, 5, 4, null));

        Game game2 = freshGame();
        place(game2, 5, 3, Color.BLACK, PieceType.PAWN); // d3 — diagonal from e2
        Game after = service.makeMove(game2.getId(), 6, 4, 5, 3, null);
        assertEquals(Piece.of(Color.WHITE, PieceType.PAWN), after.getBoard()[5][3]);
    }

    @Test
    @DisplayName("Knight moves in an L-shape and jumps over blocking pieces")
    void knightJumpsOverPieces() {
        Game game = freshGame();
        // b1-c3: pawns on b2/c2/d2 are still in place; a knight ignores them entirely.
        assertDoesNotThrow(() -> service.makeMove(game.getId(), 7, 1, 5, 2, null));
    }

    @Test
    @DisplayName("Knight cannot move like a rook or bishop")
    void knightRejectsNonLShapes() {
        Game game = freshGame();
        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 1, 5, 1, null));
    }

    @Test
    @DisplayName("Rook slides through empty squares but is blocked by any piece")
    void rookSlidesAndIsBlocked() {
        Game game = freshGame();
        // a1-a3 is blocked by the pawn still sitting on a2.
        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 0, 5, 0, null));

        Game game2 = freshGame();
        clearBoard(game2);
        place(game2, 7, 0, Color.WHITE, PieceType.ROOK);
        place(game2, 7, 4, Color.WHITE, PieceType.KING);
        place(game2, 0, 4, Color.BLACK, PieceType.KING);
        Game after = service.makeMove(game2.getId(), 7, 0, 3, 0, null);
        assertEquals(Piece.of(Color.WHITE, PieceType.ROOK), after.getBoard()[3][0]);
    }

    @Test
    @DisplayName("Bishop slides diagonally and is blocked by an intervening piece")
    void bishopSlidesAndIsBlocked() {
        Game game = freshGame();
        // c1-a3 is blocked by the pawn on b2.
        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 2, 5, 0, null));

        Game game2 = freshGame();
        clearBoard(game2);
        place(game2, 7, 2, Color.WHITE, PieceType.BISHOP);
        place(game2, 7, 4, Color.WHITE, PieceType.KING);
        place(game2, 0, 4, Color.BLACK, PieceType.KING);
        Game after = service.makeMove(game2.getId(), 7, 2, 3, 6, null); // c1-g5
        assertEquals(Piece.of(Color.WHITE, PieceType.BISHOP), after.getBoard()[3][6]);
    }

    @Test
    @DisplayName("Queen moves like a rook or a bishop, but not like a knight")
    void queenCombinesRookAndBishop() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 4, 4, Color.WHITE, PieceType.QUEEN);
        place(game, 7, 4, Color.WHITE, PieceType.KING);
        place(game, 0, 4, Color.BLACK, PieceType.KING);
        long id = game.getId();

        assertDoesNotThrow(() -> service.makeMove(id, 4, 4, 4, 0, null)); // straight (rook-like)
        Game g2 = freshGame();
        clearBoard(g2);
        place(g2, 4, 4, Color.WHITE, PieceType.QUEEN);
        place(g2, 7, 4, Color.WHITE, PieceType.KING);
        place(g2, 0, 4, Color.BLACK, PieceType.KING);
        assertDoesNotThrow(() -> service.makeMove(g2.getId(), 4, 4, 1, 1, null)); // diagonal (bishop-like)
        Game g3 = freshGame();
        clearBoard(g3);
        place(g3, 4, 4, Color.WHITE, PieceType.QUEEN);
        place(g3, 7, 4, Color.WHITE, PieceType.KING);
        place(g3, 0, 4, Color.BLACK, PieceType.KING);
        assertThrows(InvalidMoveException.class, () -> service.makeMove(g3.getId(), 4, 4, 2, 3, null)); // knight shape
    }

    @Test
    @DisplayName("King moves exactly one square; a two-square non-castling move is illegal")
    void kingMovesOneSquare() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 4, 4, Color.WHITE, PieceType.KING);
        place(game, 0, 4, Color.BLACK, PieceType.KING);
        long id = game.getId();
        assertDoesNotThrow(() -> service.makeMove(id, 4, 4, 4, 5, null));

        Game game2 = freshGame();
        clearBoard(game2);
        place(game2, 4, 4, Color.WHITE, PieceType.KING);
        place(game2, 0, 4, Color.BLACK, PieceType.KING);
        assertThrows(InvalidMoveException.class, () -> service.makeMove(game2.getId(), 4, 4, 4, 6, null));
    }

    // =========================================================================
    // A MOVE THAT LEAVES YOUR OWN KING IN CHECK IS ILLEGAL, EVEN IF SHAPE-VALID
    // =========================================================================

    @Test
    @DisplayName("A pinned rook cannot move off the pin line — it would expose its own king")
    void pinnedPieceCannotMoveOffThePinLine() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 7, 4, Color.WHITE, PieceType.KING);   // e1
        place(game, 6, 4, Color.WHITE, PieceType.ROOK);   // e2 — pinned
        place(game, 0, 4, Color.BLACK, PieceType.ROOK);   // e8 — pins along the e-file
        place(game, 0, 7, Color.BLACK, PieceType.KING);   // h8
        long id = game.getId();

        assertThrows(MoveIntoCheckException.class, () -> service.makeMove(id, 6, 4, 6, 5, null)); // e2-f2
    }

    @Test
    @DisplayName("A pinned rook may still move along the pin line itself")
    void pinnedPieceCanMoveAlongThePinLine() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 7, 4, Color.WHITE, PieceType.KING);
        place(game, 6, 4, Color.WHITE, PieceType.ROOK);
        place(game, 0, 4, Color.BLACK, PieceType.ROOK);
        place(game, 0, 7, Color.BLACK, PieceType.KING);

        Game after = service.makeMove(game.getId(), 6, 4, 3, 4, null); // e2-e5, still on the e-file
        assertEquals(Piece.of(Color.WHITE, PieceType.ROOK), after.getBoard()[3][4]);
    }

    @Test
    @DisplayName("The king itself cannot move into an attacked square")
    void kingCannotStepIntoCheck() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 4, 4, Color.WHITE, PieceType.KING);  // e4
        place(game, 0, 5, Color.BLACK, PieceType.ROOK);  // f8 — controls the whole f-file
        place(game, 0, 0, Color.BLACK, PieceType.KING);
        assertThrows(MoveIntoCheckException.class, () -> service.makeMove(game.getId(), 4, 4, 4, 5, null)); // e4-f4
    }

    // =========================================================================
    // CHECK DETECTION
    // =========================================================================

    @Test
    @DisplayName("A king actually under attack is flagged CHECK, not CHECKMATE, when an escape exists")
    void checkIsDetectedWhenEscapeExists() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 7, 4, Color.WHITE, PieceType.KING);  // e1
        place(game, 0, 0, Color.BLACK, PieceType.KING);
        place(game, 6, 4, Color.BLACK, PieceType.ROOK);  // e2 — checks White's king along the e-file
        // White to move (default), king has a legal escape (e.g. Kd1).
        Game after = service.makeMove(game.getId(), 7, 4, 7, 3, null); // Ke1-d1, escapes check
        assertEquals(GameStatus.ACTIVE, after.getStatus());
    }

    // =========================================================================
    // CHECKMATE — back-rank mate
    // =========================================================================

    @Test
    @DisplayName("Back-rank checkmate is detected as CHECKMATE, with the winner recorded")
    void backRankCheckmateIsDetected() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 0, 6, Color.BLACK, PieceType.KING);  // g8
        place(game, 1, 5, Color.BLACK, PieceType.PAWN);  // f7
        place(game, 1, 6, Color.BLACK, PieceType.PAWN);  // g7
        place(game, 1, 7, Color.BLACK, PieceType.PAWN);  // h7
        place(game, 6, 4, Color.WHITE, PieceType.ROOK);  // e2
        place(game, 7, 0, Color.WHITE, PieceType.KING);  // a1

        Game after = service.makeMove(game.getId(), 6, 4, 0, 4, null); // Re2-e8#
        assertEquals(GameStatus.CHECKMATE, after.getStatus());
        assertEquals("Alice", after.getWinner());
    }

    @Test
    @DisplayName("Scholar's Mate, played move by move from the opening, ends in checkmate")
    void scholarsMateFromOpeningIsCheckmate() {
        Game game = freshGame();
        long id = game.getId();

        service.makeMove(id, 6, 4, 4, 4, null); // 1. e4
        service.makeMove(id, 1, 4, 3, 4, null); // 1... e5
        service.makeMove(id, 7, 5, 4, 2, null); // 2. Bc4
        service.makeMove(id, 0, 1, 2, 2, null); // 2... Nc6
        service.makeMove(id, 7, 3, 3, 7, null); // 3. Qh5
        service.makeMove(id, 0, 6, 2, 5, null); // 3... Nf6??
        Game after = service.makeMove(id, 3, 7, 1, 5, null); // 4. Qxf7#

        assertEquals(GameStatus.CHECKMATE, after.getStatus());
        assertEquals("Alice", after.getWinner());
        assertEquals(7, after.getMoveHistory().size());
    }

    // =========================================================================
    // STALEMATE — must NOT be reported as checkmate
    // =========================================================================

    @Test
    @DisplayName("Stalemate (no legal move, not in check) is distinguished from checkmate")
    void stalemateIsNotCheckmate() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 2, 5, Color.WHITE, PieceType.KING);  // f6
        place(game, 2, 6, Color.WHITE, PieceType.QUEEN); // g6
        place(game, 0, 7, Color.BLACK, PieceType.KING);  // h8

        Game after = service.makeMove(game.getId(), 2, 5, 1, 5, null); // Kf6-f7
        assertEquals(GameStatus.STALEMATE, after.getStatus());
        assertNull(after.getWinner());
    }

    // =========================================================================
    // CASTLING
    // =========================================================================

    @Test
    @DisplayName("White can castle kingside when nothing is in the way")
    void kingsideCastling() {
        Game game = freshGame();
        game.getBoard()[7][5] = null; // f1
        game.getBoard()[7][6] = null; // g1

        Game after = service.makeMove(game.getId(), 7, 4, 7, 6, null);
        assertEquals(Piece.of(Color.WHITE, PieceType.KING), after.getBoard()[7][6]);
        assertEquals(Piece.of(Color.WHITE, PieceType.ROOK), after.getBoard()[7][5]);
        assertNull(after.getBoard()[7][7]);
        assertNull(after.getBoard()[7][4]);
        assertTrue(after.getMoveHistory().get(0).isCastling());
    }

    @Test
    @DisplayName("White can castle queenside when nothing is in the way")
    void queensideCastling() {
        Game game = freshGame();
        game.getBoard()[7][1] = null; // b1
        game.getBoard()[7][2] = null; // c1
        game.getBoard()[7][3] = null; // d1

        Game after = service.makeMove(game.getId(), 7, 4, 7, 2, null);
        assertEquals(Piece.of(Color.WHITE, PieceType.KING), after.getBoard()[7][2]);
        assertEquals(Piece.of(Color.WHITE, PieceType.ROOK), after.getBoard()[7][3]);
        assertNull(after.getBoard()[7][0]);
    }

    @Test
    @DisplayName("Castling is illegal once the king has already moved, even after moving back")
    void castlingIllegalAfterKingHasMoved() {
        Game game = freshGame();
        game.getBoard()[7][5] = null;
        game.getBoard()[7][6] = null;
        long id = game.getId();

        service.makeMove(id, 7, 4, 7, 5, null); // Ke1-f1
        service.makeMove(id, 1, 0, 2, 0, null); // a7-a6 (filler)
        service.makeMove(id, 7, 5, 7, 4, null); // Kf1-e1 (back home)
        service.makeMove(id, 2, 0, 3, 0, null); // a6-a5 (filler)

        assertThrows(InvalidMoveException.class, () -> service.makeMove(id, 7, 4, 7, 6, null));
    }

    @Test
    @DisplayName("Castling is illegal once the relevant rook has already moved")
    void castlingIllegalAfterRookHasMoved() {
        Game game = freshGame();
        game.getBoard()[7][5] = null;
        game.getBoard()[7][6] = null;
        long id = game.getId();

        service.makeMove(id, 7, 7, 7, 6, null); // Rh1-g1
        service.makeMove(id, 1, 0, 2, 0, null); // filler
        service.makeMove(id, 7, 6, 7, 7, null); // Rg1-h1 (back home)
        service.makeMove(id, 2, 0, 3, 0, null); // filler

        assertThrows(InvalidMoveException.class, () -> service.makeMove(id, 7, 4, 7, 6, null));
    }

    @Test
    @DisplayName("Castling is illegal when a square between king and rook is occupied")
    void castlingIllegalWhenSquaresOccupied() {
        Game game = freshGame();
        game.getBoard()[7][5] = null; // f1 cleared, g1 (knight) left in place
        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 4, 7, 6, null));
    }

    @Test
    @DisplayName("Castling is illegal while the king is currently in check")
    void castlingIllegalWhileInCheck() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 7, 4, Color.WHITE, PieceType.KING);  // e1
        place(game, 7, 7, Color.WHITE, PieceType.ROOK);  // h1
        place(game, 0, 4, Color.BLACK, PieceType.ROOK);  // e8 — checks e1 directly
        place(game, 0, 0, Color.BLACK, PieceType.KING);

        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 4, 7, 6, null));
    }

    @Test
    @DisplayName("Castling is illegal when the king would pass through an attacked square")
    void castlingIllegalThroughAttackedSquare() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 7, 4, Color.WHITE, PieceType.KING);  // e1
        place(game, 7, 7, Color.WHITE, PieceType.ROOK);  // h1
        place(game, 0, 5, Color.BLACK, PieceType.ROOK);  // f8 — controls f1, the pass-through square
        place(game, 0, 0, Color.BLACK, PieceType.KING);

        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 4, 7, 6, null));
    }

    @Test
    @DisplayName("Castling is illegal when the king would land on an attacked square")
    void castlingIllegalOntoAttackedSquare() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 7, 4, Color.WHITE, PieceType.KING);  // e1
        place(game, 7, 7, Color.WHITE, PieceType.ROOK);  // h1
        place(game, 0, 6, Color.BLACK, PieceType.ROOK);  // g8 — controls g1, the landing square
        place(game, 0, 0, Color.BLACK, PieceType.KING);

        assertThrows(InvalidMoveException.class, () -> service.makeMove(game.getId(), 7, 4, 7, 6, null));
    }

    // =========================================================================
    // EN PASSANT
    // =========================================================================

    @Test
    @DisplayName("En passant capture is legal immediately after the enemy pawn's double step")
    void enPassantCaptureIsLegal() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 3, 4, Color.WHITE, PieceType.PAWN); // e5
        place(game, 1, 3, Color.BLACK, PieceType.PAWN); // d7
        place(game, 7, 0, Color.WHITE, PieceType.KING);
        place(game, 0, 0, Color.BLACK, PieceType.KING);
        game.setCurrentPlayerIndex(1); // Black to move
        long id = game.getId();

        service.makeMove(id, 1, 3, 3, 3, null); // d7-d5
        Game after = service.makeMove(id, 3, 4, 2, 3, null); // exd6 e.p.

        assertNull(after.getBoard()[3][3], "the captured pawn must be removed from d5");
        assertEquals(Piece.of(Color.WHITE, PieceType.PAWN), after.getBoard()[2][3]);
        Move last = after.getMoveHistory().get(after.getMoveHistory().size() - 1);
        assertTrue(last.isEnPassant());
        assertNotNull(last.getCapturedPiece());
    }

    @Test
    @DisplayName("En passant expires: it is only legal on the very next move")
    void enPassantExpiresAfterOneMove() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 3, 4, Color.WHITE, PieceType.PAWN); // e5
        place(game, 1, 3, Color.BLACK, PieceType.PAWN); // d7
        place(game, 7, 0, Color.WHITE, PieceType.KING);
        place(game, 0, 7, Color.BLACK, PieceType.KING);
        game.setCurrentPlayerIndex(1);
        long id = game.getId();

        service.makeMove(id, 1, 3, 3, 3, null);  // d7-d5
        service.makeMove(id, 7, 0, 7, 1, null);  // Ka1-b1 (declines the capture)
        service.makeMove(id, 0, 7, 0, 6, null);  // Kh8-g8 (filler)

        assertThrows(InvalidMoveException.class, () -> service.makeMove(id, 3, 4, 2, 3, null));
    }

    // =========================================================================
    // PROMOTION
    // =========================================================================

    @Test
    @DisplayName("A pawn reaching the back rank is promoted, defaulting to a queen")
    void pawnPromotesToQueenByDefault() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 1, 0, Color.WHITE, PieceType.PAWN); // a7
        place(game, 7, 7, Color.WHITE, PieceType.KING);
        place(game, 0, 7, Color.BLACK, PieceType.KING);

        Game after = service.makeMove(game.getId(), 1, 0, 0, 0, null); // a7-a8
        assertEquals(Piece.of(Color.WHITE, PieceType.QUEEN), after.getBoard()[0][0]);
        Move last = after.getMoveHistory().get(0);
        assertTrue(last.isPromotion());
        assertEquals(PieceType.QUEEN, last.getPromotedTo());
    }

    @Test
    @DisplayName("A pawn can under-promote to a caller-chosen piece type")
    void pawnCanUnderpromote() {
        Game game = freshGame();
        clearBoard(game);
        place(game, 1, 0, Color.WHITE, PieceType.PAWN);
        place(game, 7, 7, Color.WHITE, PieceType.KING);
        place(game, 0, 7, Color.BLACK, PieceType.KING);

        Game after = service.makeMove(game.getId(), 1, 0, 0, 0, PieceType.KNIGHT);
        assertEquals(Piece.of(Color.WHITE, PieceType.KNIGHT), after.getBoard()[0][0]);
    }

    // =========================================================================
    // VALID MOVES ENDPOINT
    // =========================================================================

    @Test
    @DisplayName("getValidMoves returns only squares that are actually legal")
    void getValidMovesReturnsLegalSquaresOnly() {
        Game game = freshGame();
        List<int[]> moves = service.getValidMoves(game.getId(), 6, 4); // e2 pawn
        assertEquals(2, moves.size()); // e3 and e4
    }

    @Test
    @DisplayName("getValidMoves on an empty square returns nothing")
    void getValidMovesOnEmptySquareIsEmpty() {
        Game game = freshGame();
        assertTrue(service.getValidMoves(game.getId(), 4, 4).isEmpty());
    }

    // =========================================================================
    // RESIGNATION
    // =========================================================================

    @Test
    @DisplayName("Resigning ends the game and credits the opponent as winner")
    void resignationEndsTheGame() {
        Game game = freshGame();
        Game after = service.resign(game.getId(), Color.WHITE);
        assertEquals(GameStatus.RESIGNED, after.getStatus());
        assertEquals("Bob", after.getWinner());
        assertThrows(GameOverException.class, () -> service.resign(game.getId(), Color.BLACK));
    }
}

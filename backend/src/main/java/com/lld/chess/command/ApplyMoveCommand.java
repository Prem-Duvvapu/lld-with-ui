package com.lld.chess.command;

import com.lld.chess.model.Color;
import com.lld.chess.model.Game;
import com.lld.chess.model.Move;
import com.lld.chess.model.Piece;
import com.lld.chess.model.PieceType;

import java.util.List;

/**
 * The concrete {@link MoveCommand}: applies one move to a {@link Game}, handling the special
 * cases (castling relocates the rook too, en passant removes a pawn that isn't on the
 * destination square, promotion swaps the piece) and remembers enough to undo all of it.
 */
public class ApplyMoveCommand implements MoveCommand {

    private final Game game;
    private final int fromRow;
    private final int fromCol;
    private final int toRow;
    private final int toCol;
    private final PieceType requestedPromotion;

    private Piece movedPiece;
    private Piece capturedPiece;
    private boolean castling;
    private boolean enPassant;
    private boolean promotion;
    private int enPassantCapturedRow;
    private int enPassantCapturedCol;
    private int castledRookFromCol;
    private int castledRookToCol;
    private int[] enPassantTargetBefore;
    private boolean prevKingMoved;
    private Integer movedRookIndex;
    private boolean prevRookMoved;

    public ApplyMoveCommand(Game game, int fromRow, int fromCol, int toRow, int toCol, PieceType requestedPromotion) {
        this.game = game;
        this.fromRow = fromRow;
        this.fromCol = fromCol;
        this.toRow = toRow;
        this.toCol = toCol;
        this.requestedPromotion = requestedPromotion;
    }

    @Override
    public Move execute() {
        Piece[][] board = game.getBoard();
        movedPiece = board[fromRow][fromCol];
        Color color = movedPiece.getColor();
        capturedPiece = board[toRow][toCol];
        enPassantTargetBefore = game.getEnPassantTarget();

        boolean isPawn = movedPiece.getType() == PieceType.PAWN;
        enPassant = isPawn && fromCol != toCol && capturedPiece == null;
        if (enPassant) {
            enPassantCapturedRow = fromRow;
            enPassantCapturedCol = toCol;
            capturedPiece = board[enPassantCapturedRow][enPassantCapturedCol];
            board[enPassantCapturedRow][enPassantCapturedCol] = null;
        }

        board[toRow][toCol] = movedPiece;
        board[fromRow][fromCol] = null;

        castling = movedPiece.getType() == PieceType.KING && Math.abs(toCol - fromCol) == 2;
        if (movedPiece.getType() == PieceType.KING) {
            prevKingMoved = game.getKingMoved()[color.index()];
            game.getKingMoved()[color.index()] = true;
        }
        if (castling) {
            castledRookFromCol = toCol > fromCol ? 7 : 0;
            castledRookToCol = toCol > fromCol ? 5 : 3;
            board[fromRow][castledRookToCol] = board[fromRow][castledRookFromCol];
            board[fromRow][castledRookFromCol] = null;
        }

        if (movedPiece.getType() == PieceType.ROOK) {
            movedRookIndex = rookIndexFor(fromRow, fromCol);
            if (movedRookIndex != null) {
                prevRookMoved = game.getRookMoved()[movedRookIndex];
                game.getRookMoved()[movedRookIndex] = true;
            }
        }

        promotion = isPawn && (toRow == 0 || toRow == 7);
        PieceType promotedTo = null;
        if (promotion) {
            promotedTo = requestedPromotion != null ? requestedPromotion : PieceType.QUEEN;
            board[toRow][toCol] = Piece.of(color, promotedTo);
        }

        int[] newTarget = null;
        if (isPawn && Math.abs(toRow - fromRow) == 2) {
            newTarget = new int[]{(fromRow + toRow) / 2, fromCol};
        }
        game.setEnPassantTarget(newTarget);

        Move move = Move.builder()
                .fromRow(fromRow).fromCol(fromCol).toRow(toRow).toCol(toCol)
                .piece(movedPiece)
                .capturedPiece(capturedPiece)
                .castling(castling)
                .enPassant(enPassant)
                .promotion(promotion)
                .promotedTo(promotedTo)
                .build();
        game.getMoveHistory().add(move);
        return move;
    }

    @Override
    public void undo() {
        Piece[][] board = game.getBoard();
        board[fromRow][fromCol] = movedPiece;
        board[toRow][toCol] = enPassant ? null : capturedPiece;
        if (enPassant) {
            board[enPassantCapturedRow][enPassantCapturedCol] = capturedPiece;
        }
        if (castling) {
            board[fromRow][castledRookFromCol] = board[fromRow][castledRookToCol];
            board[fromRow][castledRookToCol] = null;
        }
        if (movedPiece.getType() == PieceType.KING) {
            game.getKingMoved()[movedPiece.getColor().index()] = prevKingMoved;
        }
        if (movedRookIndex != null) {
            game.getRookMoved()[movedRookIndex] = prevRookMoved;
        }
        game.setEnPassantTarget(enPassantTargetBefore);

        List<Move> history = game.getMoveHistory();
        if (!history.isEmpty()) history.remove(history.size() - 1);
    }

    /** White rook home squares -> 0 (queenside) / 2 (kingside); black -> 1 (queenside) / 3 (kingside). */
    private static Integer rookIndexFor(int row, int col) {
        if (row == 7 && col == 0) return 0;
        if (row == 0 && col == 0) return 1;
        if (row == 7 && col == 7) return 2;
        if (row == 0 && col == 7) return 3;
        return null;
    }
}

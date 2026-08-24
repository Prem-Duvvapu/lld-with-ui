package com.lld.chess.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class Game {
    private long id;
    private Piece[][] board;
    private Player[] players;
    private int currentPlayerIndex;
    private GameStatus status;
    private String winner;
    private List<Move> moveHistory;
    private boolean[] kingMoved;
    private boolean[] rookMoved;
    /** Square a pawn skipped over on the immediately preceding double-step, or null if none. */
    private int[] enPassantTarget;

    public Game() {}

    public Game(long id, Player white, Player black) {
        this.id = id;
        this.players = new Player[]{white, black};
        this.currentPlayerIndex = 0;
        this.status = GameStatus.ACTIVE;
        this.moveHistory = new ArrayList<>();
        this.kingMoved = new boolean[2];
        this.rookMoved = new boolean[4];
        this.board = new Piece[8][8];
        this.enPassantTarget = null;
        initBoard();
    }

    private void initBoard() {
        PieceType[] backRank = {PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
                PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK};
        for (int c = 0; c < 8; c++) {
            board[0][c] = Piece.of(Color.BLACK, backRank[c]);
            board[1][c] = Piece.of(Color.BLACK, PieceType.PAWN);
            board[6][c] = Piece.of(Color.WHITE, PieceType.PAWN);
            board[7][c] = Piece.of(Color.WHITE, backRank[c]);
        }
    }

    public Color currentColor() {
        return Color.fromIndex(currentPlayerIndex);
    }
}

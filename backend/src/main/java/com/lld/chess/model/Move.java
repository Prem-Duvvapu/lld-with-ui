package com.lld.chess.model;

public class Move {
    private int fromRow;
    private int fromCol;
    private int toRow;
    private int toCol;
    private String piece;
    private String capturedPiece;
    private boolean isCastling;
    private boolean isEnPassant;
    private boolean isPromotion;

    public Move() {}

    public Move(int fromRow, int fromCol, int toRow, int toCol, String piece) {
        this.fromRow = fromRow;
        this.fromCol = fromCol;
        this.toRow = toRow;
        this.toCol = toCol;
        this.piece = piece;
    }

    public int getFromRow() { return fromRow; }
    public void setFromRow(int fromRow) { this.fromRow = fromRow; }
    public int getFromCol() { return fromCol; }
    public void setFromCol(int fromCol) { this.fromCol = fromCol; }
    public int getToRow() { return toRow; }
    public void setToRow(int toRow) { this.toRow = toRow; }
    public int getToCol() { return toCol; }
    public void setToCol(int toCol) { this.toCol = toCol; }
    public String getPiece() { return piece; }
    public void setPiece(String piece) { this.piece = piece; }
    public String getCapturedPiece() { return capturedPiece; }
    public void setCapturedPiece(String capturedPiece) { this.capturedPiece = capturedPiece; }
    public boolean isCastling() { return isCastling; }
    public void setCastling(boolean castling) { isCastling = castling; }
    public boolean isEnPassant() { return isEnPassant; }
    public void setEnPassant(boolean enPassant) { isEnPassant = enPassant; }
    public boolean isPromotion() { return isPromotion; }
    public void setPromotion(boolean promotion) { isPromotion = promotion; }
}
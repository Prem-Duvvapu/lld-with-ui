package com.lld.chess.command;

import com.lld.chess.model.Move;

/**
 * Encapsulates applying one already-validated move to a {@code Game} as a reversible unit,
 * decoupling the mutation (board write, castling rook hop, en-passant capture, promotion,
 * move-history append) from the validation that decided the move was legal in the first place.
 */
public interface MoveCommand {
    /** Mutates the game and returns the recorded {@link Move}. */
    Move execute();

    /** Reverts exactly what {@link #execute()} did, restoring the pre-move game state. */
    void undo();
}

package com.lld.ludo.model;

import com.lld.ludo.exception.InvalidMoveException;
import com.lld.ludo.state.TokenState;
import com.lld.ludo.state.TokenStates;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One of a player's 4 tokens. {@link #transitionTo(TokenStatus)} is the single place
 * {@link #status} ever changes — it delegates legality to the {@link TokenState} for the current
 * status, the same shape as {@code taskmanagement.model.Task#transitionTo}. Callers (the service,
 * under the per-game lock) hold responsibility for computing the target status and the resulting
 * {@link #position}; this method only enforces that the transition itself is legal.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Token {
    private int id;
    private String color;
    /** -1 while HOME; a cell on {@code Game.TRACK_SIZE} while ACTIVE or FINISHED. */
    private int position;
    private TokenStatus status;

    public static Token newHomeToken(int id, String color) {
        return Token.builder().id(id).color(color).position(-1).status(TokenStatus.HOME).build();
    }

    /**
     * Validates {@code target} against this token's current status's declared legal-next set and
     * applies it if legal. Throws {@link InvalidMoveException} otherwise — the enforcement point
     * that rejects moving a token that is still HOME without having rolled a 6 elsewhere in the
     * service, and unconditionally rejects any further move once a token is FINISHED (its
     * {@code allowedNext()} is empty).
     */
    public void transitionTo(TokenStatus target) {
        TokenState current = TokenStates.of(this.status);
        if (!current.canTransitionTo(target)) {
            throw new InvalidMoveException(
                    "Token " + id + " (" + color + ") cannot move from " + status + " to " + target
                            + " — legal next states are " + current.allowedNext() + ".");
        }
        this.status = target;
    }
}

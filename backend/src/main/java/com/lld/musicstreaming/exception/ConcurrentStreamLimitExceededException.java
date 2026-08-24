package com.lld.musicstreaming.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a user's plan-defined concurrent-stream cap is already reached.
 * The check-then-increment this guards is done under {@link com.lld.musicstreaming.service.PlaybackService}'s
 * per-user lock — see that class for why the compound operation needs one.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConcurrentStreamLimitExceededException extends MusicStreamingException {
    public ConcurrentStreamLimitExceededException(String message) {
        super(message);
    }
}

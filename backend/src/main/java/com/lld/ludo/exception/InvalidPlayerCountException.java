package com.lld.ludo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * {@code createGame} needs exactly 4 non-blank player names. The board geometry
 * ({@code START_POSITIONS}, {@code SAFE_SPOTS}, the 4-color token palette) is a compile-time
 * 4-player layout, so unlike Snake &amp; Ladders' 2-4 range, Ludo here does not support a
 * variable seat count — see RCA-021 for the crash this validation replaced.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidPlayerCountException extends LudoException {
    public InvalidPlayerCountException(String message) {
        super(message);
    }
}

package com.lld.config;

import java.time.Instant;
import java.util.Map;

/**
 * The one error body shape every module returns.
 *
 * <p>Replaces the {@code Map.of("error", e.getMessage())} idiom that was repeated
 * across 16 controllers. {@link Map#of} rejects null values, and
 * {@code getMessage()} is null for a NullPointerException and for many
 * ClassCastExceptions — exactly the failures those handlers were wrapping — so
 * the handler itself threw and the caller got a 500 instead of the intended 4xx.
 *
 * <p>{@code error} is never null: it falls back to the exception's simple name.
 */
public record ErrorResponse(
        String error,
        String code,
        int status,
        Instant timestamp
) {

    private static final String UNKNOWN = "Unexpected error";

    public static String messageOf(Throwable t) {
        if (t == null) {
            return UNKNOWN;
        }
        String message = t.getMessage();
        if (message != null && !message.isBlank()) {
            return message;
        }
        // No message (NPE, some CCEs): fall back to something the caller can act on.
        String simpleName = t.getClass().getSimpleName();
        return simpleName.isBlank() ? UNKNOWN : simpleName;
    }

    /** Null-safe 400 response for a failure with no explicit status. */
    public static ErrorResponse of(Throwable t) {
        return of(t, 400);
    }

    public static ErrorResponse of(Throwable t, int status) {
        return new ErrorResponse(
                messageOf(t),
                t == null ? UNKNOWN : t.getClass().getSimpleName(),
                status,
                Instant.now()
        );
    }

    public static ErrorResponse of(String message, String code, int status) {
        return new ErrorResponse(
                message == null || message.isBlank() ? UNKNOWN : message,
                code,
                status,
                Instant.now()
        );
    }
}

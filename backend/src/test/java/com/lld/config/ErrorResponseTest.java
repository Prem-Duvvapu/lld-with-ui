package com.lld.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The whole point of ErrorResponse is that it cannot blow up while reporting a
 * failure. These cases are the ones the old {@code Map.of("error", e.getMessage())}
 * idiom got wrong.
 */
class ErrorResponseTest {

    @Test
    @DisplayName("keeps a real message")
    void keepsRealMessage() {
        ErrorResponse r = ErrorResponse.of(new IllegalStateException("Seat 12A is already held"));
        assertEquals("Seat 12A is already held", r.error());
        assertEquals("IllegalStateException", r.code());
        assertEquals(400, r.status());
        assertNotNull(r.timestamp());
    }

    @Test
    @DisplayName("a null message falls back to the exception name instead of throwing")
    void nullMessageDoesNotThrow() {
        NullPointerException npe = new NullPointerException();
        assertNull(npe.getMessage());

        // The exact case that broke the old idiom: Map.of rejects null values, so
        // the error handler itself threw and the caller got a 500, not the 400 the
        // handler was written to return.
        assertThrows(NullPointerException.class, () -> Map.of("error", npe.getMessage()));

        // ErrorResponse degrades instead.
        ErrorResponse r = ErrorResponse.of(npe);
        assertEquals("NullPointerException", r.error());
        assertEquals("NullPointerException", r.code());
        assertEquals(400, r.status());
    }

    @Test
    @DisplayName("a blank message falls back to the exception name")
    void blankMessageFallsBack() {
        assertEquals("IllegalArgumentException", ErrorResponse.of(new IllegalArgumentException("   ")).error());
        assertEquals("IllegalArgumentException", ErrorResponse.of(new IllegalArgumentException("")).error());
    }

    @Test
    @DisplayName("a null throwable still produces a usable body")
    void nullThrowable() {
        ErrorResponse r = ErrorResponse.of((Throwable) null);
        assertEquals("Unexpected error", r.error());
        assertEquals("Unexpected error", r.code());
    }

    @Test
    @DisplayName("carries the status it was given")
    void carriesStatus() {
        assertEquals(409, ErrorResponse.of(new IllegalStateException("taken"), 409).status());
        assertEquals(410, ErrorResponse.of(new IllegalStateException("gone"), 410).status());
    }

    @Test
    @DisplayName("messageOf is null-safe for every input")
    void messageOfIsTotal() {
        assertEquals("Unexpected error", ErrorResponse.messageOf(null));
        assertEquals("NullPointerException", ErrorResponse.messageOf(new NullPointerException()));
        assertEquals("boom", ErrorResponse.messageOf(new RuntimeException("boom")));
    }

    @Test
    @DisplayName("explicit factory rejects blank messages")
    void explicitFactory() {
        assertEquals("Unexpected error", ErrorResponse.of(null, "X", 400).error());
        assertEquals("Unexpected error", ErrorResponse.of("  ", "X", 400).error());
        assertEquals("nope", ErrorResponse.of("nope", "X", 422).error());
        assertEquals(422, ErrorResponse.of("nope", "X", 422).status());
    }
}

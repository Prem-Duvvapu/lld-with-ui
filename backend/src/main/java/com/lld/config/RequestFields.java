package com.lld.config;

import java.util.List;
import java.util.Map;

/**
 * Typed reads out of a {@code Map<String, Object>} request body.
 *
 * <p>299 of this codebase's 360 {@code @RequestBody} parameters are raw maps, read with
 * unchecked casts:
 *
 * <pre>{@code double amount = ((Number) body.get("amount")).doubleValue();}</pre>
 *
 * <p>A caller who omits {@code amount} gets a NullPointerException; one who sends
 * {@code "12.50"} as a string gets a ClassCastException. Neither is a
 * {@link DomainException}, so both fall through to Spring's default handler as HTTP 500 —
 * a client error reported as a server failure, with no indication of which field was
 * wrong.
 *
 * <p>Bean Validation is not an option at this boundary: {@code @Valid} needs a bean with
 * annotated fields, and a raw Map has none. These helpers do the same job in the same
 * place, throwing {@link IllegalArgumentException} — which
 * {@link GlobalExceptionHandler} already maps to 400 — with the field name in the
 * message.
 */
public final class RequestFields {

    private RequestFields() {
    }

    private static Object present(Map<String, ?> body, String field) {
        if (body == null) {
            throw new IllegalArgumentException("A JSON request body is required");
        }
        Object value = body.get(field);
        if (value == null) {
            throw new IllegalArgumentException("Field '" + field + "' is required");
        }
        return value;
    }

    public static String requireString(Map<String, ?> body, String field) {
        Object value = present(body, field);
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Field '" + field + "' must not be blank");
        }
        return text;
    }

    public static double requireDouble(Map<String, ?> body, String field) {
        Object value = present(body, field);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        // JSON numbers arrive as Number, but a caller sending "12.50" as a string is
        // making an understandable mistake worth accepting rather than rejecting.
        try {
            return Double.parseDouble(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Field '" + field + "' must be a number, got: " + value);
        }
    }

    public static long requireLong(Map<String, ?> body, String field) {
        Object value = present(body, field);
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Field '" + field + "' must be a whole number, got: " + value);
        }
    }

    public static int requireInt(Map<String, ?> body, String field) {
        return Math.toIntExact(requireLong(body, field));
    }

    public static boolean requireBoolean(Map<String, ?> body, String field) {
        Object value = present(body, field);
        if (value instanceof Boolean flag) {
            return flag;
        }
        String text = String.valueOf(value).trim();
        if ("true".equalsIgnoreCase(text) || "false".equalsIgnoreCase(text)) {
            return Boolean.parseBoolean(text);
        }
        throw new IllegalArgumentException("Field '" + field + "' must be true or false, got: " + value);
    }

    /**
     * A required JSON array. The element type is unchecked, exactly as the hand-written
     * casts were — the win here is that a missing or non-array field says so instead of
     * throwing from inside a stream several lines later.
     */
    @SuppressWarnings("unchecked")
    public static <T> List<T> requireList(Map<String, ?> body, String field) {
        Object value = present(body, field);
        if (!(value instanceof List<?> list)) {
            throw new IllegalArgumentException("Field '" + field + "' must be an array");
        }
        if (list.isEmpty()) {
            throw new IllegalArgumentException("Field '" + field + "' must not be empty");
        }
        return (List<T>) list;
    }

    public static String optionalString(Map<String, ?> body, String field, String fallback) {
        if (body == null || body.get(field) == null) {
            return fallback;
        }
        return String.valueOf(body.get(field)).trim();
    }
}

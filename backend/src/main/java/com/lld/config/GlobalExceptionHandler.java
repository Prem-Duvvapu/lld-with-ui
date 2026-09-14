package com.lld.config;

import jakarta.validation.ConstraintViolationException;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Turns domain exceptions into the status code each one means, with a readable body.
 *
 * <p>Before this existed, airline / library / linkedin / stockbroker threw 27
 * domain exceptions that all extended RuntimeException with no status mapping and
 * no try/catch in their controllers, so every one surfaced as a bare HTTP 500.
 * Spring Boot also strips exception messages from the default error body, so the
 * frontend's {@code body.error || body.message} lookup found nothing and showed
 * "HTTP 500 Internal Server Error" — a caller holding a taken seat had no idea why.
 *
 * <p>Deliberately narrow: it handles domain exceptions and the common
 * argument/lookup failures, and leaves framework exceptions (404 for unmapped
 * paths, media-type and validation errors) to Spring's own resolvers.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Any module's domain exception. The status comes from {@code @ResponseStatus}
     * on the concrete class; unannotated domain failures are client errors.
     */
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponse> handleDomain(DomainException ex) {
        HttpStatus status = statusOf(ex, HttpStatus.BAD_REQUEST);
        return ResponseEntity.status(status).body(ErrorResponse.of(ex, status.value()));
    }

    // Exceptions outside a module's marker hierarchy that carry their own
    // @ResponseStatus (atm, pubsub and shoppingcart annotate RuntimeException
    // subclasses directly) are left to Spring's ResponseStatusExceptionResolver.
    // A broad RuntimeException handler here would also intercept Spring's own
    // request-parsing exceptions, so instead server.error.include-message=always
    // keeps their messages in the default body.

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(ex, 400));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(ex, 404));
    }

    /**
     * A body that isn't valid JSON, or whose types can't be bound. Spring's default body
     * for these is a different shape from every other error this API returns, so the
     * frontend's {@code body.error || body.message} lookup behaved inconsistently
     * depending on whether the failure came from a module or from the framework.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of("Request body is not readable as JSON", "BAD_REQUEST", 400));
    }

    /** Bean Validation failures on the request DTOs that do exist, reported field by field. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleInvalidArgument(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> "'" + error.getField() + "' " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        String message = detail.isEmpty() ? "Request validation failed" : detail;
        return ResponseEntity.badRequest().body(ErrorResponse.of(message, "BAD_REQUEST", 400));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(ex, 400));
    }

    private HttpStatus statusOf(Throwable ex, HttpStatus fallback) {
        ResponseStatus annotation = AnnotationUtils.findAnnotation(ex.getClass(), ResponseStatus.class);
        return annotation == null ? fallback : annotation.value();
    }
}

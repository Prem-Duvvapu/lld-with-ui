package com.lld.config;

import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;

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

    private HttpStatus statusOf(Throwable ex, HttpStatus fallback) {
        ResponseStatus annotation = AnnotationUtils.findAnnotation(ex.getClass(), ResponseStatus.class);
        return annotation == null ? fallback : annotation.value();
    }
}

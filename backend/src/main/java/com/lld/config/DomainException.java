package com.lld.config;

/**
 * Base class for a module's domain exception hierarchy.
 *
 * <p>Each module's base exception extends this, which lets
 * {@link GlobalExceptionHandler} map the whole hierarchy to a proper HTTP status
 * and a readable body without the config package having to import every module.
 *
 * <p>The concrete status comes from {@code @ResponseStatus} on the specific
 * exception class; anything unannotated is treated as a client error (400),
 * because a domain rule violation is by definition the caller's problem, not a
 * server fault.
 *
 * <p>A class rather than an interface because {@code @ExceptionHandler} requires
 * a {@code Class<? extends Throwable>}, which an interface cannot satisfy.
 * Extending RuntimeException keeps every existing {@code catch (RuntimeException)}
 * and unchecked-throw site working unchanged.
 */
public abstract class DomainException extends RuntimeException {

    protected DomainException(String message) {
        super(message);
    }

    protected DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}

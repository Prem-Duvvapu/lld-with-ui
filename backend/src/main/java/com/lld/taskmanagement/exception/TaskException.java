package com.lld.taskmanagement.exception;

import com.lld.config.DomainException;

/**
 * Base exception for the task-management module. No status of its own — every concrete
 * subclass carries the HTTP status; this class exists so callers can catch the whole module
 * hierarchy and so {@code GlobalExceptionHandler} can recognise it.
 *
 * <p>Abstract, like {@code InventoryException}: {@code DomainExceptionContractTest} scans the
 * classpath with a component provider that skips abstract classes by default, so this base needs
 * no manual allowlist entry there.
 */
public abstract class TaskException extends DomainException {
    protected TaskException(String message) {
        super(message);
    }
}

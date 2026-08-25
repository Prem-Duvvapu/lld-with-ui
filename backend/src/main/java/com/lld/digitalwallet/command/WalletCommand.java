package com.lld.digitalwallet.command;

import com.lld.digitalwallet.model.Transaction;

/**
 * Encapsulates one mutating wallet operation (credit, debit or transfer) as a self-contained,
 * executable unit — the arithmetic, locking and validation for that operation live entirely
 * inside the concrete command, not scattered across {@code WalletService} methods.
 *
 * <p>{@code WalletService} appends every executed command to a {@code List<WalletCommand>}
 * command log, so the wallet's operational history is literally the sequence of commands that
 * ran — {@link #execute()} is idempotent to call exactly once per command instance and returns
 * the {@link Transaction} record it produced, which is what the log and the REST responses
 * actually expose.
 */
public interface WalletCommand {
    /** Performs the operation under the correct lock(s) and returns the resulting transaction record. */
    Transaction execute();

    /** Short human-readable label for the command log / sim event feed. */
    default String describe() {
        return getClass().getSimpleName();
    }
}

package com.lld.digitalwallet.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A user's wallet. Balance is only ever mutated by {@link com.lld.digitalwallet.command.WalletCommand}
 * executions holding this wallet's per-wallet lock — the Lombok setter exists for the command classes
 * and tests, not for callers to bypass the locking discipline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {
    private long id;
    private String userId;
    private String userName;
    private double balance;
    private String currency;
    private LocalDateTime createdAt;
}

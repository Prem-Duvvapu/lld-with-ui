package com.lld.digitalwallet.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Immutable-after-creation record of one financial operation, produced by exactly one
 * {@link com.lld.digitalwallet.command.WalletCommand} execution. A CREDIT/DEBIT only
 * touches {@code walletId}; a TRANSFER touches {@code fromWalletId} and {@code toWalletId}
 * and is stored against both wallets' histories.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    public enum Type { CREDIT, DEBIT, TRANSFER }

    public enum Status { COMPLETED, FAILED }

    private long id;
    private Long fromWalletId;
    private Long toWalletId;
    /** The wallet whose history this row is filed under (== fromWalletId for a debit/transfer, == the credited wallet for a credit). */
    private Long walletId;
    private double amount;
    private Type type;
    private Status status;
    private LocalDateTime timestamp;
    private String description;
}

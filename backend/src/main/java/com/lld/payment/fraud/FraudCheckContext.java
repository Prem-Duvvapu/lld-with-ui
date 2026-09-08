package com.lld.payment.fraud;

import com.lld.payment.model.PaymentMethodType;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Everything a {@link FraudCheckHandler} needs to decide, computed once by
 * {@code PaymentService} before entering the chain — handlers stay pure decision units with no
 * repository access of their own.
 */
@Data
@AllArgsConstructor
public class FraudCheckContext {
    private String payerId;
    private double amount;
    private PaymentMethodType method;
    /** How many charges this payer has submitted within the velocity window, INCLUDING this one. */
    private int recentChargeCountForPayer;
}

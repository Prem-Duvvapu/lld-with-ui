package com.lld.payment.fraud;

import org.springframework.stereotype.Component;

import java.util.Optional;

/** Rejects a charge above the configured per-transaction ceiling. The final link in the chain. */
@Component
public class AmountLimitHandler extends FraudCheckHandler {

    public static final double MAX_AMOUNT = 500_000.0;

    @Override
    protected Optional<String> evaluate(FraudCheckContext context) {
        if (context.getAmount() > MAX_AMOUNT) {
            return Optional.of(String.format(
                    "Amount limit check failed: %.2f exceeds the per-transaction ceiling of %.2f",
                    context.getAmount(), MAX_AMOUNT));
        }
        return Optional.empty();
    }
}

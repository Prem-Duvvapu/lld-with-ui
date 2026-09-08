package com.lld.payment.fraud;

import org.springframework.stereotype.Component;

import java.util.Optional;

/** Rejects a charge if this payer has submitted too many charges within the velocity window. */
@Component
public class VelocityCheckHandler extends FraudCheckHandler {

    public static final int MAX_CHARGES_IN_WINDOW = 3;

    @Override
    protected Optional<String> evaluate(FraudCheckContext context) {
        if (context.getRecentChargeCountForPayer() > MAX_CHARGES_IN_WINDOW) {
            return Optional.of(String.format(
                    "Velocity check failed: payer %s submitted %d charges within the velocity window (max %d)",
                    context.getPayerId(), context.getRecentChargeCountForPayer(), MAX_CHARGES_IN_WINDOW));
        }
        return Optional.empty();
    }
}

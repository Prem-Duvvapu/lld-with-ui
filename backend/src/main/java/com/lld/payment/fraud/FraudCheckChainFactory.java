package com.lld.payment.fraud;

import org.springframework.stereotype.Component;

/**
 * Wires the fraud pipeline in one fixed order — VelocityCheckHandler → BlacklistCheckHandler →
 * AmountLimitHandler — the same {@code setNext} linking shape as
 * {@code logging.chain.LogHandlerChainBuilder}.
 */
@Component
public class FraudCheckChainFactory {

    private final FraudCheckHandler chainHead;

    public FraudCheckChainFactory(VelocityCheckHandler velocity, BlacklistCheckHandler blacklist, AmountLimitHandler amountLimit) {
        velocity.setNext(blacklist).setNext(amountLimit);
        this.chainHead = velocity;
    }

    public FraudCheckResult run(FraudCheckContext context) {
        return chainHead.check(context);
    }
}

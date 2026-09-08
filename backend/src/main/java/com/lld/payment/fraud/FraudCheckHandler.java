package com.lld.payment.fraud;

import java.util.Optional;

/**
 * Chain of Responsibility base — same {@code setNext}/template-method shape as
 * {@code logging.chain.LogHandler}. Each concrete handler decides independently whether to
 * reject; the base class owns delegating to the next handler when this one passes.
 */
public abstract class FraudCheckHandler {
    protected FraudCheckHandler nextHandler;

    public FraudCheckHandler setNext(FraudCheckHandler next) {
        this.nextHandler = next;
        return next;
    }

    public final FraudCheckResult check(FraudCheckContext context) {
        Optional<String> rejection = evaluate(context);
        if (rejection.isPresent()) {
            return FraudCheckResult.rejected(rejection.get());
        }
        if (nextHandler != null) {
            return nextHandler.check(context);
        }
        return FraudCheckResult.approved();
    }

    /** Empty = this handler passes the charge on; present = the rejection reason, chain short-circuits. */
    protected abstract Optional<String> evaluate(FraudCheckContext context);
}

package com.lld.payment.fraud;

import com.lld.payment.model.PaymentMethodType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the Chain of Responsibility actually short-circuits, in order, with the right reason. */
public class FraudCheckChainTest {

    private FraudCheckChainFactory newChain() {
        return new FraudCheckChainFactory(new VelocityCheckHandler(), new BlacklistCheckHandler(), new AmountLimitHandler());
    }

    @Test
    void aCleanChargePassesEveryHandler() {
        FraudCheckResult result = newChain().run(new FraudCheckContext("payer-1", 1000.0, PaymentMethodType.UPI, 1));
        assertTrue(result.isApproved());
        assertNull(result.getRejectionReason());
    }

    @Test
    void tooManyRecentChargesTripsTheVelocityCheckFirst() {
        FraudCheckResult result = newChain().run(new FraudCheckContext("payer-1", 1000.0, PaymentMethodType.UPI,
                VelocityCheckHandler.MAX_CHARGES_IN_WINDOW + 1));
        assertFalse(result.isApproved());
        assertTrue(result.getRejectionReason().contains("Velocity"));
    }

    @Test
    void aBlacklistedPayerIsRejectedEvenWithNormalVelocityAndAmount() {
        FraudCheckResult result = newChain().run(new FraudCheckContext("payer-blacklisted-1", 1000.0, PaymentMethodType.UPI, 1));
        assertFalse(result.isApproved());
        assertTrue(result.getRejectionReason().contains("Blacklist"));
    }

    @Test
    void anAmountOverTheCeilingIsRejectedByTheFinalHandler() {
        FraudCheckResult result = newChain().run(new FraudCheckContext("payer-1", AmountLimitHandler.MAX_AMOUNT + 1, PaymentMethodType.UPI, 1));
        assertFalse(result.isApproved());
        assertTrue(result.getRejectionReason().contains("Amount limit"));
    }

    @Test
    void velocityFailureShortCircuitsBeforeEvenReachingTheBlacklistCheck() {
        // payer-blacklisted-1 would ALSO fail the blacklist check -- proves velocity, first in the
        // chain, is the one that actually fires (not just that this payer is rejected somehow).
        FraudCheckResult result = newChain().run(new FraudCheckContext("payer-blacklisted-1", 1000.0, PaymentMethodType.UPI,
                VelocityCheckHandler.MAX_CHARGES_IN_WINDOW + 1));
        assertFalse(result.isApproved());
        assertTrue(result.getRejectionReason().contains("Velocity"), "velocity must fire first, not blacklist");
    }
}

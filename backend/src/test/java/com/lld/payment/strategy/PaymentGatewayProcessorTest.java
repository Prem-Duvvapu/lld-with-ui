package com.lld.payment.strategy;

import com.lld.payment.model.PaymentMethodType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class PaymentGatewayProcessorTest {

    private final PaymentGatewayProcessor processor = new PaymentGatewayProcessor(List.of(
            new CreditCardPaymentMethodStrategy(), new UpiPaymentMethodStrategy(), new WalletPaymentMethodStrategy()));

    @Test
    void eachMethodResolvesToItsOwnTransactionIdPrefix() {
        assertTrue(processor.process("PAY-1", 100.0, PaymentMethodType.CREDIT_CARD).startsWith("TX-CC-"));
        assertTrue(processor.process("PAY-2", 100.0, PaymentMethodType.UPI).startsWith("TX-UPI-"));
        assertTrue(processor.process("PAY-3", 100.0, PaymentMethodType.WALLET).startsWith("TX-WAL-"));
    }

    @Test
    void everyPaymentMethodTypeHasARegisteredStrategy() {
        for (PaymentMethodType type : PaymentMethodType.values()) {
            assertNotNull(processor.process("PAY-X", 1.0, type), "no strategy registered for " + type);
        }
    }
}

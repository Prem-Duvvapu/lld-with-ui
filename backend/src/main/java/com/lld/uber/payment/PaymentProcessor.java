package com.lld.uber.payment;

import org.springframework.stereotype.Component;

@Component("uberPaymentProcessor")
public class PaymentProcessor {

    public boolean validate(Payment payment) {
        return payment != null && payment.getAmount() > 0 && payment.getMethod() != null;
    }

    public Payment process(Payment payment) {
        if (!validate(payment)) {
            if (payment != null) payment.setStatus(PaymentStatus.FAILED);
            return payment;
        }
        payment.setStatus(PaymentStatus.COMPLETED);
        return payment;
    }
}

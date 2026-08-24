package com.lld.carrental.payment;

import com.lld.carrental.model.PaymentStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component("carRentalPaymentProcessor")
public class PaymentProcessor {

    public boolean validate(Payment payment) {
        return payment != null && payment.getAmount() > 0 && payment.getMethod() != null;
    }

    /** Authorises and captures payment for a reservation. */
    public Payment process(Payment payment) {
        if (!validate(payment)) {
            if (payment != null) {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setTimestamp(LocalDateTime.now());
            }
            return payment;
        }
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setTimestamp(LocalDateTime.now());
        return payment;
    }

    /** Reverses a completed payment on cancellation. */
    public Payment refund(Payment payment) {
        if (payment != null && payment.getStatus() == PaymentStatus.COMPLETED) {
            payment.setStatus(PaymentStatus.REFUNDED);
            payment.setTimestamp(LocalDateTime.now());
        }
        return payment;
    }
}

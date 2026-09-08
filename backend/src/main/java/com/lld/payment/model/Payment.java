package com.lld.payment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

import java.util.concurrent.locks.ReentrantLock;

/**
 * A payment attempt. {@code status} is mutated only through {@link #transitionTo}, the one place
 * this payment's lifecycle can move, matching the declared-transition-table idiom used across the
 * repo. {@code paymentLock} is a fair, per-payment {@code ReentrantLock} — held across the whole
 * "re-check status, then transition" sequence for both refund and the internal capture step, so
 * two concurrent refund attempts on the same payment can never both succeed. Lombok
 * {@code @Getter} only (matching {@code shoppingcart.model.Product} / {@code locker.model.Locker}
 * precedent): a mutable {@code ReentrantLock} must never end up in a generated
 * {@code equals}/{@code hashCode}, so it is excluded via {@code @Getter(AccessLevel.NONE)} and
 * exposed through a hand-written, {@code @JsonIgnore}d getter instead.
 */
@Getter
public class Payment {
    private final String id;
    private final String idempotencyKey;
    private final String payerId;
    private final double amount;
    private final PaymentMethodType method;
    private final long createdAtEpoch;

    private volatile PaymentStatus status = PaymentStatus.INITIATED;

    @Setter
    private String transactionId;
    @Setter
    private String failureReason;
    @Setter
    private Long refundedAtEpoch;

    @Getter(AccessLevel.NONE)
    private final ReentrantLock paymentLock = new ReentrantLock(true);

    public Payment(String id, String idempotencyKey, String payerId, double amount, PaymentMethodType method, long createdAtEpoch) {
        this.id = id;
        this.idempotencyKey = idempotencyKey;
        this.payerId = payerId;
        this.amount = amount;
        this.method = method;
        this.createdAtEpoch = createdAtEpoch;
    }

    /** The single enforcement point for this payment's lifecycle. Callers must already hold {@link #getLock()}. */
    public void transitionTo(PaymentStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new IllegalStateException("Payment " + id + " cannot move from " + status + " to " + target);
        }
        this.status = target;
    }

    @JsonIgnore
    public ReentrantLock getLock() {
        return paymentLock;
    }
}

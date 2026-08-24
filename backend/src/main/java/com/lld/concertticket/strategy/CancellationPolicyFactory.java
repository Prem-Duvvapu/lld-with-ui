package com.lld.concertticket.strategy;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Resolves the {@link CancellationPolicy} to apply from how far out the event is at
 * cancellation time: &gt;=7 days -&gt; full refund, 2-6 days -&gt; 50% refund, &lt;2 days -&gt;
 * no refund. New tiers are one more branch here, not a change to every call site.
 */
@Component
public class CancellationPolicyFactory {
    private final FullRefundPolicy fullRefundPolicy;
    private final PartialRefundPolicy partialRefundPolicy;
    private final NoRefundPolicy noRefundPolicy;

    public CancellationPolicyFactory(FullRefundPolicy fullRefundPolicy,
                                      PartialRefundPolicy partialRefundPolicy,
                                      NoRefundPolicy noRefundPolicy) {
        this.fullRefundPolicy = fullRefundPolicy;
        this.partialRefundPolicy = partialRefundPolicy;
        this.noRefundPolicy = noRefundPolicy;
    }

    public CancellationPolicy resolve(LocalDateTime eventDateTime, LocalDateTime cancelTime) {
        long daysUntilEvent = Duration.between(cancelTime, eventDateTime).toDays();
        if (daysUntilEvent >= 7) {
            return fullRefundPolicy;
        }
        if (daysUntilEvent >= 2) {
            return partialRefundPolicy;
        }
        return noRefundPolicy;
    }
}

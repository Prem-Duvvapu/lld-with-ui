package com.lld.threadpool;

import com.lld.threadpool.strategy.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Each policy is a stateless singleton whose {@code decide()} is fixed — this pins that mapping
 *  and the factory's routing, one test per {@link RejectionPolicyType}. */
class RejectionPolicyTest {

    @Test
    @DisplayName("AbortPolicy decides ABORT")
    void abort() {
        assertEquals(RejectionAction.ABORT, AbortPolicy.INSTANCE.decide());
        assertEquals(RejectionPolicyType.ABORT, AbortPolicy.INSTANCE.type());
    }

    @Test
    @DisplayName("CallerRunsPolicy decides CALLER_RUNS")
    void callerRuns() {
        assertEquals(RejectionAction.CALLER_RUNS, CallerRunsPolicy.INSTANCE.decide());
        assertEquals(RejectionPolicyType.CALLER_RUNS, CallerRunsPolicy.INSTANCE.type());
    }

    @Test
    @DisplayName("DiscardPolicy decides DISCARD")
    void discard() {
        assertEquals(RejectionAction.DISCARD, DiscardPolicy.INSTANCE.decide());
        assertEquals(RejectionPolicyType.DISCARD, DiscardPolicy.INSTANCE.type());
    }

    @Test
    @DisplayName("DiscardOldestPolicy decides DISCARD_OLDEST")
    void discardOldest() {
        assertEquals(RejectionAction.DISCARD_OLDEST, DiscardOldestPolicy.INSTANCE.decide());
        assertEquals(RejectionPolicyType.DISCARD_OLDEST, DiscardOldestPolicy.INSTANCE.type());
    }

    @Test
    @DisplayName("the factory resolves every type to the matching singleton")
    void factoryResolvesEveryType() {
        RejectionPolicyFactory factory = new RejectionPolicyFactory();
        assertSame(AbortPolicy.INSTANCE, factory.create(RejectionPolicyType.ABORT));
        assertSame(CallerRunsPolicy.INSTANCE, factory.create(RejectionPolicyType.CALLER_RUNS));
        assertSame(DiscardPolicy.INSTANCE, factory.create(RejectionPolicyType.DISCARD));
        assertSame(DiscardOldestPolicy.INSTANCE, factory.create(RejectionPolicyType.DISCARD_OLDEST));
    }
}

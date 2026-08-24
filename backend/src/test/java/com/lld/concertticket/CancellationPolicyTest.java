package com.lld.concertticket;

import com.lld.concertticket.enums.BookingStatus;
import com.lld.concertticket.model.Booking;
import com.lld.concertticket.strategy.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CancellationPolicyTest {

    private Booking bookingOf(double amount) {
        return Booking.builder()
                .id(1L)
                .userId("user1")
                .totalAmount(amount)
                .status(BookingStatus.CONFIRMED)
                .build();
    }

    @Test
    void fullRefundPolicy_refundsEntireAmount() {
        FullRefundPolicy policy = new FullRefundPolicy();
        Booking booking = bookingOf(1000.0);
        assertEquals(1000.0, policy.calculateRefund(booking, LocalDateTime.now().plusDays(10), LocalDateTime.now()));
        assertEquals("FULL_REFUND", policy.getPolicyName());
    }

    @Test
    void partialRefundPolicy_refundsHalf() {
        PartialRefundPolicy policy = new PartialRefundPolicy();
        Booking booking = bookingOf(1000.0);
        assertEquals(500.0, policy.calculateRefund(booking, LocalDateTime.now().plusDays(4), LocalDateTime.now()));
        assertEquals("PARTIAL_REFUND_50", policy.getPolicyName());
    }

    @Test
    void noRefundPolicy_refundsNothing() {
        NoRefundPolicy policy = new NoRefundPolicy();
        Booking booking = bookingOf(1000.0);
        assertEquals(0.0, policy.calculateRefund(booking, LocalDateTime.now().plusHours(6), LocalDateTime.now()));
        assertEquals("NO_REFUND", policy.getPolicyName());
    }

    // ---------------------------------------------------------------- factory boundaries

    private CancellationPolicyFactory factory() {
        return new CancellationPolicyFactory(new FullRefundPolicy(), new PartialRefundPolicy(), new NoRefundPolicy());
    }

    @Test
    void factory_sevenOrMoreDaysOut_resolvesFullRefund() {
        LocalDateTime now = LocalDateTime.now();
        assertInstanceOf(FullRefundPolicy.class, factory().resolve(now.plusDays(7), now));
        assertInstanceOf(FullRefundPolicy.class, factory().resolve(now.plusDays(30), now));
    }

    @Test
    void factory_twoToSixDaysOut_resolvesPartialRefund() {
        LocalDateTime now = LocalDateTime.now();
        assertInstanceOf(PartialRefundPolicy.class, factory().resolve(now.plusDays(2), now));
        assertInstanceOf(PartialRefundPolicy.class, factory().resolve(now.plusDays(6), now));
    }

    @Test
    void factory_underTwoDaysOut_resolvesNoRefund() {
        LocalDateTime now = LocalDateTime.now();
        assertInstanceOf(NoRefundPolicy.class, factory().resolve(now.plusDays(1), now));
        assertInstanceOf(NoRefundPolicy.class, factory().resolve(now.plusHours(2), now));
        assertInstanceOf(NoRefundPolicy.class, factory().resolve(now.minusHours(1), now));
    }

    @Test
    void factory_delegatesRefundCalculationToResolvedPolicy() {
        LocalDateTime now = LocalDateTime.now();
        Booking booking = bookingOf(2000.0);
        CancellationPolicyFactory factory = factory();

        assertEquals(2000.0, factory.resolve(now.plusDays(10), now).calculateRefund(booking, now.plusDays(10), now));
        assertEquals(1000.0, factory.resolve(now.plusDays(3), now).calculateRefund(booking, now.plusDays(3), now));
        assertEquals(0.0, factory.resolve(now.plusHours(1), now).calculateRefund(booking, now.plusHours(1), now));
    }
}

package com.lld.airline.strategy;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.FareType;
import com.lld.airline.model.Booking;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class RefundPolicyFactoryTest {

    private final TieredCancellationRefundPolicy tiered = new TieredCancellationRefundPolicy();
    private final NonRefundableFarePolicy nonRefundable = new NonRefundableFarePolicy();
    private final RefundPolicyFactory factory = new RefundPolicyFactory(tiered, nonRefundable);

    private Booking booking(double amount) {
        return Booking.builder()
                .bookingId("BK-1")
                .flightId("F1")
                .userId("u1")
                .passengers(List.of())
                .seatNumbers(List.of("1A"))
                .totalAmount(amount)
                .status(BookingStatus.CONFIRMED)
                .build();
    }

    @Test
    void factoryResolvesFlexibleFareToTieredPolicy() {
        assertSame(tiered, factory.forFareType(FareType.FLEXIBLE));
    }

    @Test
    void factoryResolvesBasicFareToNonRefundablePolicy() {
        assertSame(nonRefundable, factory.forFareType(FareType.BASIC));
    }

    @Test
    void factoryDefaultsToFlexibleWhenFareTypeIsNull() {
        assertSame(tiered, factory.forFareType(null));
    }

    @Test
    void tieredPolicyGivesFullRefundAtLeastTwentyFourHoursOut() {
        LocalDateTime departure = LocalDateTime.now().plusHours(30);
        double refund = tiered.calculateRefund(booking(10000.0), departure, LocalDateTime.now());
        assertEquals(10000.0, refund);
    }

    @Test
    void tieredPolicyGivesHalfRefundBetweenTwoAndTwentyFourHoursOut() {
        LocalDateTime departure = LocalDateTime.now().plusHours(10);
        double refund = tiered.calculateRefund(booking(10000.0), departure, LocalDateTime.now());
        assertEquals(5000.0, refund);
    }

    @Test
    void tieredPolicyGivesNoRefundInsideTwoHoursOut() {
        LocalDateTime departure = LocalDateTime.now().plusMinutes(30);
        double refund = tiered.calculateRefund(booking(10000.0), departure, LocalDateTime.now());
        assertEquals(0.0, refund);
    }

    @Test
    void tieredPolicyGivesNoRefundAfterDeparture() {
        LocalDateTime departure = LocalDateTime.now().minusHours(1);
        double refund = tiered.calculateRefund(booking(10000.0), departure, LocalDateTime.now());
        assertEquals(0.0, refund);
    }

    @Test
    void nonRefundablePolicyNeverRefundsRegardlessOfNotice() {
        LocalDateTime farOut = LocalDateTime.now().plusDays(60);
        LocalDateTime lastMinute = LocalDateTime.now().plusMinutes(5);
        assertEquals(0.0, nonRefundable.calculateRefund(booking(10000.0), farOut, LocalDateTime.now()));
        assertEquals(0.0, nonRefundable.calculateRefund(booking(10000.0), lastMinute, LocalDateTime.now()));
    }
}

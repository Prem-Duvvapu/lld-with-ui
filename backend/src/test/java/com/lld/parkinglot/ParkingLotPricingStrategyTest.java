package com.lld.parkinglot;

import com.lld.parkinglot.exception.InvalidParkingRequestException;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.strategy.DynamicPricingStrategy;
import com.lld.parkinglot.strategy.FlatRatePricingStrategy;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategyFactory;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/** Pins the exact math of every pricing strategy and the factory's string -> strategy resolution. */
class ParkingLotPricingStrategyTest {

    private final HourlyPricingStrategy hourly = new HourlyPricingStrategy();
    private final FlatRatePricingStrategy flat = new FlatRatePricingStrategy();
    private final DynamicPricingStrategy dynamic = new DynamicPricingStrategy();
    private final PricingStrategyFactory factory = new PricingStrategyFactory(hourly, flat, dynamic);

    private Ticket ticketFor(VehicleType type, long hoursParked) {
        LocalDateTime entry = LocalDateTime.now().minusHours(hoursParked);
        Ticket ticket = new Ticket("TKT-1", "V1", type, "SPOT-1", entry);
        ticket.setExitTime(LocalDateTime.now());
        return ticket;
    }

    // ---- HourlyPricingStrategy ----

    @Test
    void hourly_car_chargesRatePerHour() {
        assertEquals(60.0, hourly.calculatePrice(ticketFor(VehicleType.CAR, 3)));
    }

    @Test
    void hourly_bike_chargesRatePerHour() {
        assertEquals(30.0, hourly.calculatePrice(ticketFor(VehicleType.BIKE, 3)));
    }

    @Test
    void hourly_truck_chargesRatePerHour() {
        assertEquals(120.0, hourly.calculatePrice(ticketFor(VehicleType.TRUCK, 3)));
    }

    @Test
    void hourly_partialHour_isRoundedUpToOneHourMinimum() {
        Ticket ticket = new Ticket("TKT-1", "V1", VehicleType.CAR, "SPOT-1", LocalDateTime.now().minusMinutes(20));
        ticket.setExitTime(LocalDateTime.now());
        assertEquals(20.0, hourly.calculatePrice(ticket), "Less than an hour must still bill one full hour");
    }

    @Test
    void hourly_usesNowWhenExitTimeIsNull() {
        Ticket ticket = new Ticket("TKT-1", "V1", VehicleType.CAR, "SPOT-1", LocalDateTime.now().minusHours(2));
        assertEquals(40.0, hourly.calculatePrice(ticket));
    }

    // ---- FlatRatePricingStrategy ----

    @Test
    void flat_car_isFlatRegardlessOfDuration() {
        assertEquals(50.0, flat.calculatePrice(ticketFor(VehicleType.CAR, 1)));
        assertEquals(50.0, flat.calculatePrice(ticketFor(VehicleType.CAR, 10)));
    }

    @Test
    void flat_bike_isFlatRate() {
        assertEquals(25.0, flat.calculatePrice(ticketFor(VehicleType.BIKE, 5)));
    }

    @Test
    void flat_truck_isFlatRate() {
        assertEquals(100.0, flat.calculatePrice(ticketFor(VehicleType.TRUCK, 5)));
    }

    // ---- DynamicPricingStrategy ----

    @Test
    void dynamic_appliesSurchargeMultiplierOverHourlyBase() {
        double hourlyAmount = hourly.calculatePrice(ticketFor(VehicleType.CAR, 2));
        double dynamicAmount = dynamic.calculatePrice(ticketFor(VehicleType.CAR, 2));
        assertEquals(hourlyAmount * 1.5, dynamicAmount, 0.0001);
    }

    @Test
    void dynamic_bike_appliesExactSurcharge() {
        assertEquals(15.0, dynamic.calculatePrice(ticketFor(VehicleType.BIKE, 1)));
    }

    // ---- PricingStrategyFactory ----

    @Test
    void factory_resolvesHourlyByName() {
        assertSame(hourly, factory.getStrategy("HOURLY"));
        assertSame(hourly, factory.getStrategy("hourly"));
    }

    @Test
    void factory_resolvesFlatByName() {
        assertSame(flat, factory.getStrategy("FLAT"));
    }

    @Test
    void factory_resolvesDynamicByName() {
        assertSame(dynamic, factory.getStrategy("DYNAMIC"));
    }

    @Test
    void factory_defaultsToHourlyWhenNameIsNullOrBlank() {
        assertSame(hourly, factory.getStrategy(null));
        assertSame(hourly, factory.getStrategy("  "));
    }

    @Test
    void factory_throwsForUnknownStrategyName() {
        assertThrows(InvalidParkingRequestException.class, () -> factory.getStrategy("BOGUS"));
    }
}

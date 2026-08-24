package com.lld.carrental;

import com.lld.carrental.model.VehicleType;
import com.lld.carrental.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tiered pricing in isolation. Duration decides the tier (1-2 days standard, 3-6 days
 * 10% off, 7+ days 20% off); the vehicle category decides the base rate. Pinning the
 * arithmetic and the tier boundaries down here means CarRentalService never has to.
 */
@DisplayName("Car Rental Tiered Pricing Strategies")
class PricingStrategyTest {

    private StandardPricingStrategy standard;
    private WeeklyDiscountPricingStrategy weekly;
    private LongRentalDiscountPricingStrategy longRental;
    private PricingStrategyFactory factory;

    @BeforeEach
    void setUp() {
        standard = new StandardPricingStrategy();
        weekly = new WeeklyDiscountPricingStrategy();
        longRental = new LongRentalDiscountPricingStrategy();
        factory = new PricingStrategyFactory(standard, weekly, longRental);
    }

    @Test
    @DisplayName("Standard tier charges exactly the category's base daily rate times days")
    void standardChargesBaseRateTimesDays() {
        assertEquals(3600.0, standard.calculateCost(VehicleType.SEDAN, 2), 0.001); // 1800 * 2
        assertEquals(1200.0, standard.calculateCost(VehicleType.HATCHBACK, 1), 0.001);
    }

    @Test
    @DisplayName("Weekly-discount tier applies exactly 10% off")
    void weeklyTierApplies10PercentOff() {
        double expected = 2800.0 * 4 * 0.9; // SUV, 4 days
        assertEquals(expected, weekly.calculateCost(VehicleType.SUV, 4), 0.001);
    }

    @Test
    @DisplayName("Long-rental tier applies exactly 20% off")
    void longRentalTierApplies20PercentOff() {
        double expected = 3200.0 * 10 * 0.8; // VAN, 10 days
        assertEquals(expected, longRental.calculateCost(VehicleType.VAN, 10), 0.001);
    }

    @Test
    @DisplayName("Costs are rounded to paise, never left with float dust")
    void costsAreRoundedToPaise() {
        double cost = weekly.calculateCost(VehicleType.TRUCK, 3);
        assertEquals(Math.round(cost * 100.0) / 100.0, cost, 0.0, "cost carried more than two decimal places");
    }

    @ParameterizedTest
    @EnumSource(VehicleType.class)
    @DisplayName("Every category prices above zero and rises with duration")
    void everyCategoryPricesMonotonically(VehicleType type) {
        double twoDays = standard.calculateCost(type, 2);
        double tenDays = longRental.calculateCost(type, 10);
        assertTrue(twoDays > 0, type + " priced at zero or below");
        assertTrue(tenDays > twoDays, type + " did not price a longer rental higher");
    }

    @Test
    @DisplayName("Factory resolves standard for 1-2 days")
    void factoryResolvesStandardForShortDurations() {
        assertSame(standard, factory.forDuration(1));
        assertSame(standard, factory.forDuration(2));
    }

    @Test
    @DisplayName("Factory resolves weekly discount for 3-6 days")
    void factoryResolvesWeeklyForMidDurations() {
        assertSame(weekly, factory.forDuration(3));
        assertSame(weekly, factory.forDuration(5));
        assertSame(weekly, factory.forDuration(6));
    }

    @Test
    @DisplayName("Factory resolves long-rental discount for 7+ days")
    void factoryResolvesLongRentalForLongDurations() {
        assertSame(longRental, factory.forDuration(7));
        assertSame(longRental, factory.forDuration(30));
    }

    @Test
    @DisplayName("Tier boundaries are exact, not off by one on either side")
    void tierBoundariesAreExact() {
        assertSame(standard, factory.forDuration(2));
        assertSame(weekly, factory.forDuration(3));
        assertSame(weekly, factory.forDuration(6));
        assertSame(longRental, factory.forDuration(7));
    }

    @Test
    @DisplayName("A longer rental in a higher tier can still cost less per day, but the strategies are named distinctly")
    void strategiesAreNamed() {
        assertEquals("STANDARD", standard.getName());
        assertEquals("WEEKLY_DISCOUNT", weekly.getName());
        assertEquals("LONG_RENTAL_DISCOUNT", longRental.getName());
    }

    @Test
    @DisplayName("All three strategies satisfy the interface polymorphically")
    void allStrategiesArePolymorphic() {
        for (PricingStrategy strategy : new PricingStrategy[]{standard, weekly, longRental}) {
            assertNotNull(strategy.getName());
            assertTrue(strategy.calculateCost(VehicleType.SEDAN, 3) > 0);
        }
    }

    @Test
    @DisplayName("Higher categories cost more than lower ones for the same duration and tier")
    void categoriesAreOrderedByPrice() {
        double hatchback = standard.calculateCost(VehicleType.HATCHBACK, 2);
        double sedan = standard.calculateCost(VehicleType.SEDAN, 2);
        double suv = standard.calculateCost(VehicleType.SUV, 2);
        double truck = standard.calculateCost(VehicleType.TRUCK, 2);

        assertTrue(hatchback < sedan);
        assertTrue(sedan < suv);
        assertTrue(suv < truck);
    }
}

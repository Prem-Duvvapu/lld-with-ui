package com.lld.uber;

import com.lld.uber.model.VehicleType;
import com.lld.uber.strategy.FarePricingStrategy;
import com.lld.uber.strategy.FarePricingStrategyFactory;
import com.lld.uber.strategy.StandardFarePricingStrategy;
import com.lld.uber.strategy.SurgeFarePricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pricing in isolation. This used to be a `switch (vehicleType)` inlined in two service
 * methods that had already drifted apart, so the arithmetic is worth pinning down.
 */
@DisplayName("Uber Fare Pricing Strategies")
class FarePricingStrategyTest {

    private StandardFarePricingStrategy standard;
    private SurgeFarePricingStrategy surge;
    private FarePricingStrategyFactory factory;

    @BeforeEach
    void setUp() {
        standard = new StandardFarePricingStrategy();
        surge = new SurgeFarePricingStrategy(standard);
        factory = new FarePricingStrategyFactory(standard, surge);
    }

    @Test
    @DisplayName("Standard fare is base plus distance times the vehicle's per-km rate")
    void standardFareIsBasePlusDistance() {
        // 25.0 base + 10 km * 12.0/km = 145.0
        assertEquals(145.0, standard.calculateFare(10.0, VehicleType.UBER_GO), 0.001);
        // 25.0 + 10 * 18.0 = 205.0
        assertEquals(205.0, standard.calculateFare(10.0, VehicleType.UBER_XL), 0.001);
        // 25.0 + 10 * 25.0 = 275.0
        assertEquals(275.0, standard.calculateFare(10.0, VehicleType.UBER_PREMIUM), 0.001);
    }

    @Test
    @DisplayName("A zero-distance trip still costs the base fare")
    void zeroDistanceCostsBaseFare() {
        assertEquals(StandardFarePricingStrategy.BASE_FARE,
                standard.calculateFare(0.0, VehicleType.UBER_GO), 0.001);
    }

    @Test
    @DisplayName("Fares are rounded to paise, never left with float dust")
    void faresAreRoundedToPaise() {
        double fare = standard.calculateFare(3.333333, VehicleType.UBER_GO);
        assertEquals(Math.round(fare * 100.0) / 100.0, fare, 0.0,
                "fare carried more than two decimal places");
    }

    @ParameterizedTest
    @EnumSource(VehicleType.class)
    @DisplayName("Every vehicle class prices above base and rises with distance")
    void everyVehicleTypePricesMonotonically(VehicleType type) {
        double shortTrip = standard.calculateFare(2.0, type);
        double longTrip = standard.calculateFare(20.0, type);

        assertTrue(shortTrip > StandardFarePricingStrategy.BASE_FARE, type + " priced at or below base");
        assertTrue(longTrip > shortTrip, type + " did not price a longer trip higher");
    }

    @Test
    @DisplayName("Vehicle classes are ordered: GO cheaper than XL cheaper than PREMIUM")
    void vehicleClassesAreOrderedByPrice() {
        double go = standard.calculateFare(10.0, VehicleType.UBER_GO);
        double xl = standard.calculateFare(10.0, VehicleType.UBER_XL);
        double premium = standard.calculateFare(10.0, VehicleType.UBER_PREMIUM);

        assertTrue(go < xl, "UBER_GO should undercut UBER_XL");
        assertTrue(xl < premium, "UBER_XL should undercut UBER_PREMIUM");
    }

    @Test
    @DisplayName("Surge multiplies the standard fare by its multiplier")
    void surgeMultipliesStandardFare() {
        double base = standard.calculateFare(10.0, VehicleType.UBER_GO);
        double surged = surge.calculateFare(10.0, VehicleType.UBER_GO);

        assertEquals(base * SurgeFarePricingStrategy.DEFAULT_MULTIPLIER, surged, 0.01);
        assertTrue(surged > base, "surge must cost more than standard");
    }

    @Test
    @DisplayName("A 1.0x multiplier makes surge pricing identical to standard")
    void surgeAtOneEqualsStandard() {
        surge.setMultiplier(1.0);
        assertEquals(standard.calculateFare(7.5, VehicleType.UBER_XL),
                surge.calculateFare(7.5, VehicleType.UBER_XL), 0.001);
    }

    @Test
    @DisplayName("Multipliers outside 1.0x–5.0x are rejected, and the old value survives")
    void multiplierBoundsAreEnforced() {
        assertThrows(IllegalArgumentException.class, () -> surge.setMultiplier(0.9));
        assertThrows(IllegalArgumentException.class, () -> surge.setMultiplier(5.1));
        assertThrows(IllegalArgumentException.class, () -> surge.setMultiplier(-2.0));

        assertEquals(SurgeFarePricingStrategy.DEFAULT_MULTIPLIER, surge.getMultiplier(), 0.001,
                "a rejected multiplier must not have been applied");
    }

    @Test
    @DisplayName("Multiplier boundaries themselves are accepted")
    void multiplierBoundariesAreInclusive() {
        assertDoesNotThrow(() -> surge.setMultiplier(1.0));
        assertDoesNotThrow(() -> surge.setMultiplier(5.0));
        assertEquals(5.0, surge.getMultiplier(), 0.001);
    }

    @Test
    @DisplayName("Factory resolves standard or surge from the demand flag")
    void factoryResolvesByDemand() {
        assertSame(standard, factory.forDemand(false));
        assertSame(surge, factory.forDemand(true));
    }

    @Test
    @DisplayName("Strategy names identify themselves for the UI and event log")
    void strategiesAreNamed() {
        assertEquals("STANDARD", standard.getName());
        assertTrue(surge.getName().startsWith("SURGE_"), "surge name was " + surge.getName());

        surge.setMultiplier(2.5);
        assertTrue(surge.getName().contains("2.5"),
                "surge name should carry the live multiplier, was " + surge.getName());
    }

    @Test
    @DisplayName("Both strategies satisfy the interface polymorphically")
    void bothStrategiesArePolymorphic() {
        for (FarePricingStrategy strategy : new FarePricingStrategy[]{standard, surge}) {
            assertNotNull(strategy.getName());
            assertTrue(strategy.calculateFare(5.0, VehicleType.UBER_GO) > 0);
        }
    }
}

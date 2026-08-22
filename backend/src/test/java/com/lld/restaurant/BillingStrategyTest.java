package com.lld.restaurant;

import com.lld.restaurant.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the billing arithmetic from section 2.3 of the spec. The worked examples
 * are deterministic, so any mismatch means the formula drifted.
 */
@DisplayName("Restaurant Billing Strategies")
class BillingStrategyTest {

    private StandardBillingStrategy standard;
    private HappyHourBillingStrategy happyHour;

    @BeforeEach
    void setUp() {
        standard = new StandardBillingStrategy();
        happyHour = new HappyHourBillingStrategy();
    }

    // ---- Strategy names ----

    @Test
    @DisplayName("StandardBillingStrategy is named STANDARD")
    void standardName() {
        assertEquals("STANDARD", standard.getName());
    }

    @Test
    @DisplayName("HappyHourBillingStrategy is named HAPPY_HOUR_20%")
    void happyHourName() {
        assertEquals("HAPPY_HOUR_20%", happyHour.getName());
    }

    // ---- Standard arithmetic (discount rate = 0.00) ----

    @Test
    @DisplayName("Standard: ₹1000 subtotal → discount 0, tax 50, service 100, total 1150")
    void standardWorkedExample() {
        BillBreakdown b = standard.compute(1000.00);
        assertEquals(1000.00, b.subtotal(), 0.001);
        assertEquals(0.00, b.discount(), 0.001);
        assertEquals(50.00, b.tax(), 0.001);
        assertEquals(100.00, b.serviceCharge(), 0.001);
        assertEquals(1150.00, b.total(), 0.001);
    }

    @Test
    @DisplayName("Standard: ₹0 subtotal → total 0 under standard")
    void standardZeroSubtotal() {
        BillBreakdown b = standard.compute(0.00);
        assertEquals(0.00, b.total(), 0.001);
        assertEquals(0.00, b.tax(), 0.001);
        assertEquals(0.00, b.serviceCharge(), 0.001);
    }

    // ---- Happy hour arithmetic (discount rate = 0.20) ----

    @Test
    @DisplayName("Happy Hour: ₹1000 subtotal → discount 200, tax 40, service 80, total 920")
    void happyHourWorkedExample() {
        BillBreakdown b = happyHour.compute(1000.00);
        assertEquals(1000.00, b.subtotal(), 0.001);
        assertEquals(200.00, b.discount(), 0.001);
        assertEquals(40.00, b.tax(), 0.001);
        assertEquals(80.00, b.serviceCharge(), 0.001);
        assertEquals(920.00, b.total(), 0.001);
    }

    @Test
    @DisplayName("Happy Hour: ₹0 subtotal → total 0 under happy hour")
    void happyHourZeroSubtotal() {
        BillBreakdown b = happyHour.compute(0.00);
        assertEquals(0.00, b.total(), 0.001);
        assertEquals(0.00, b.discount(), 0.001);
    }

    // ---- Rounding ----

    @Test
    @DisplayName("Values are rounded to 2 decimals (paise precision)")
    void roundingToPaise() {
        BillBreakdown b = standard.compute(333.33);
        // taxable = 333.33, tax = 333.33 * 0.05 = 16.6665 → 16.67
        assertEquals(16.67, b.tax(), 0.001);
        // service = 333.33 * 0.10 = 33.333 → 33.33
        assertEquals(33.33, b.serviceCharge(), 0.001);
        // total = 333.33 + 16.67 + 33.33 = 383.33
        assertEquals(383.33, b.total(), 0.001);
    }

    @Test
    @DisplayName("Happy hour rounding to paise")
    void happyHourRoundingToPaise() {
        BillBreakdown b = happyHour.compute(333.33);
        // discount = 333.33 * 0.20 = 66.666 → 66.67
        assertEquals(66.67, b.discount(), 0.001);
        // taxable = 333.33 - 66.67 = 266.66
        // tax = 266.66 * 0.05 = 13.333 → 13.33
        assertEquals(13.33, b.tax(), 0.001);
        // service = 266.66 * 0.10 = 26.666 → 26.67
        assertEquals(26.67, b.serviceCharge(), 0.001);
    }

    // ---- Factory time boundaries ----

    @Test
    @DisplayName("Factory: 15:59 → STANDARD")
    void factoryBefore1600() {
        BillingStrategy s = BillingStrategyFactory.forTime(LocalTime.of(15, 59));
        assertEquals("STANDARD", s.getName());
    }

    @Test
    @DisplayName("Factory: 16:00 → HAPPY_HOUR_20%")
    void factoryAt1600() {
        BillingStrategy s = BillingStrategyFactory.forTime(LocalTime.of(16, 0));
        assertEquals("HAPPY_HOUR_20%", s.getName());
    }

    @Test
    @DisplayName("Factory: 18:59 → HAPPY_HOUR_20%")
    void factoryAt1859() {
        BillingStrategy s = BillingStrategyFactory.forTime(LocalTime.of(18, 59));
        assertEquals("HAPPY_HOUR_20%", s.getName());
    }

    @Test
    @DisplayName("Factory: 19:00 → STANDARD")
    void factoryAt1900() {
        BillingStrategy s = BillingStrategyFactory.forTime(LocalTime.of(19, 0));
        assertEquals("STANDARD", s.getName());
    }

    @Test
    @DisplayName("Factory: null time → STANDARD (defensive)")
    void factoryNullTime() {
        BillingStrategy s = BillingStrategyFactory.forTime(null);
        assertEquals("STANDARD", s.getName());
    }

    // ---- Interface polymorphism ----

    @Test
    @DisplayName("Both strategies satisfy the BillingStrategy interface polymorphically")
    void bothStrategiesArePolymorphic() {
        for (BillingStrategy strategy : new BillingStrategy[]{standard, happyHour}) {
            assertNotNull(strategy.getName());
            BillBreakdown b = strategy.compute(100.0);
            assertTrue(b.total() > 0, strategy.getName() + " produced non-positive total");
        }
    }
}

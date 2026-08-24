package com.lld.zomato;

import com.lld.zomato.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Zomato Delivery Fee Strategies")
class DeliveryFeeStrategyTest {

    private StandardDeliveryFeeStrategy standard;
    private SurgeDeliveryFeeStrategy surge;
    private FreeDeliveryStrategy free;

    @BeforeEach
    void setUp() {
        standard = new StandardDeliveryFeeStrategy();
        surge = new SurgeDeliveryFeeStrategy(2.0);
        free = new FreeDeliveryStrategy();
    }

    @Test
    @DisplayName("Strategy names match documented values")
    void strategyNames() {
        assertEquals("STANDARD", standard.getName());
        assertEquals("SURGE_2.0x", surge.getName());
        assertEquals("FREE_ABOVE_500", free.getName());

        SurgeDeliveryFeeStrategy customSurge = new SurgeDeliveryFeeStrategy(1.5);
        assertEquals("SURGE_1.5x", customSurge.getName());
    }

    @Test
    @DisplayName("Standard strategy: 30 base + 8 per km")
    void standardFeeCalculation() {
        assertEquals(30.00, standard.computeFee(0.0, 300.0), 0.001);
        assertEquals(50.00, standard.computeFee(2.5, 300.0), 0.001);
        assertEquals(70.00, standard.computeFee(5.0, 300.0), 0.001);
    }

    @Test
    @DisplayName("Surge strategy: standard fee multiplied by multiplier")
    void surgeFeeCalculation() {
        assertEquals(140.00, surge.computeFee(5.0, 300.0), 0.001);
        assertEquals(60.00, surge.computeFee(0.0, 300.0), 0.001);
    }

    @Test
    @DisplayName("Free delivery strategy always returns 0.0")
    void freeDeliveryFee() {
        assertEquals(0.00, free.computeFee(5.0, 600.0), 0.001);
        assertEquals(0.00, free.computeFee(15.0, 1000.0), 0.001);
    }

    @Test
    @DisplayName("Fee calculations are rounded to paise (2 decimal places)")
    void roundingToPaise() {
        // 30.0 + 8.0 * 1.33 = 40.64
        assertEquals(40.64, standard.computeFee(1.33, 200.0), 0.001);

        SurgeDeliveryFeeStrategy surge15 = new SurgeDeliveryFeeStrategy(1.5);
        // 40.64 * 1.5 = 60.96
        assertEquals(60.96, surge15.computeFee(1.33, 200.0), 0.001);
    }

    @Test
    @DisplayName("Surge multiplier rejects values below 1.0 and keeps old value")
    void surgeMultiplierLowerBound() {
        SurgeDeliveryFeeStrategy s = new SurgeDeliveryFeeStrategy(2.0);
        assertThrows(IllegalArgumentException.class, () -> s.setMultiplier(0.9));
        assertEquals(2.0, s.getMultiplier(), 0.001);
        assertEquals("SURGE_2.0x", s.getName());
    }

    @Test
    @DisplayName("Surge multiplier rejects values above 3.0 and keeps old value")
    void surgeMultiplierUpperBound() {
        SurgeDeliveryFeeStrategy s = new SurgeDeliveryFeeStrategy(2.0);
        assertThrows(IllegalArgumentException.class, () -> s.setMultiplier(3.1));
        assertEquals(2.0, s.getMultiplier(), 0.001);
        assertEquals("SURGE_2.0x", s.getName());
    }

    @Test
    @DisplayName("Surge constructor enforces 1.0 to 3.0 range")
    void surgeConstructorBounds() {
        assertThrows(IllegalArgumentException.class, () -> new SurgeDeliveryFeeStrategy(0.5));
        assertThrows(IllegalArgumentException.class, () -> new SurgeDeliveryFeeStrategy(3.5));
        assertDoesNotThrow(() -> new SurgeDeliveryFeeStrategy(1.0));
        assertDoesNotThrow(() -> new SurgeDeliveryFeeStrategy(3.0));
    }

    @Test
    @DisplayName("Factory: orderValue >= 500.0 resolves to FreeDeliveryStrategy")
    void factoryFreeDelivery() {
        DeliveryFeeStrategy s1 = DeliveryFeeStrategyFactory.forConditions(600.0, 12, 4);
        assertEquals("FREE_ABOVE_500", s1.getName());
        assertEquals(0.00, s1.computeFee(5.0, 600.0), 0.001);

        // Boundary: exactly 500.0
        DeliveryFeeStrategy s2 = DeliveryFeeStrategyFactory.forConditions(500.0, 12, 4);
        assertEquals("FREE_ABOVE_500", s2.getName());
    }

    @Test
    @DisplayName("Factory: availableAgents == 0 resolves to SurgeDeliveryFeeStrategy at 2.0x")
    void factoryZeroAgentsSurge() {
        DeliveryFeeStrategy s = DeliveryFeeStrategyFactory.forConditions(300.0, 0, 0);
        assertEquals("SURGE_2.0x", s.getName());
        assertEquals(140.00, s.computeFee(5.0, 300.0), 0.001);
    }

    @Test
    @DisplayName("Factory: pendingOrders >= availableAgents * 3 resolves to SurgeDeliveryFeeStrategy at 2.0x")
    void factoryHighDemandSurge() {
        // Exactly at boundary: 12 pending with 4 agents (12 >= 4 * 3)
        DeliveryFeeStrategy s1 = DeliveryFeeStrategyFactory.forConditions(300.0, 12, 4);
        assertEquals("SURGE_2.0x", s1.getName());
        assertEquals(140.00, s1.computeFee(5.0, 300.0), 0.001);

        // Above boundary: 15 pending with 4 agents
        DeliveryFeeStrategy s2 = DeliveryFeeStrategyFactory.forConditions(300.0, 15, 4);
        assertEquals("SURGE_2.0x", s2.getName());
    }

    @Test
    @DisplayName("Factory: normal conditions resolve to StandardDeliveryFeeStrategy")
    void factoryStandardConditions() {
        // Below boundary: 11 pending with 4 agents (11 < 12)
        DeliveryFeeStrategy s1 = DeliveryFeeStrategyFactory.forConditions(300.0, 11, 4);
        assertEquals("STANDARD", s1.getName());
        assertEquals(70.00, s1.computeFee(5.0, 300.0), 0.001);

        DeliveryFeeStrategy s2 = DeliveryFeeStrategyFactory.forConditions(300.0, 1, 4);
        assertEquals("STANDARD", s2.getName());
    }

    @Test
    @DisplayName("Worked examples from spec table assert expected values")
    void workedExamplesFromSpec() {
        // 5 km, 300 val, 1 pending, 4 agents -> 70.00 STANDARD
        DeliveryFeeStrategy s1 = DeliveryFeeStrategyFactory.forConditions(300.0, 1, 4);
        assertEquals(70.00, s1.computeFee(5.0, 300.0), 0.001);
        assertEquals("STANDARD", s1.getName());

        // 5 km, 300 val, 12 pending, 4 agents -> 140.00 SURGE_2.0x
        DeliveryFeeStrategy s2 = DeliveryFeeStrategyFactory.forConditions(300.0, 12, 4);
        assertEquals(140.00, s2.computeFee(5.0, 300.0), 0.001);
        assertEquals("SURGE_2.0x", s2.getName());

        // 5 km, 600 val, 12 pending, 4 agents -> 0.00 FREE_ABOVE_500
        DeliveryFeeStrategy s3 = DeliveryFeeStrategyFactory.forConditions(600.0, 12, 4);
        assertEquals(0.00, s3.computeFee(5.0, 600.0), 0.001);
        assertEquals("FREE_ABOVE_500", s3.getName());

        // 0 km, 300 val, 1 pending, 4 agents -> 30.00 STANDARD
        DeliveryFeeStrategy s4 = DeliveryFeeStrategyFactory.forConditions(300.0, 1, 4);
        assertEquals(30.00, s4.computeFee(0.0, 300.0), 0.001);
        assertEquals("STANDARD", s4.getName());

        // 2.5 km, 300 val, 1 pending, 4 agents -> 50.00 STANDARD
        DeliveryFeeStrategy s5 = DeliveryFeeStrategyFactory.forConditions(300.0, 1, 4);
        assertEquals(50.00, s5.computeFee(2.5, 300.0), 0.001);
        assertEquals("STANDARD", s5.getName());
    }

    @Test
    @DisplayName("All strategies are polymorphic under DeliveryFeeStrategy interface")
    void polymorphicStrategyExecution() {
        DeliveryFeeStrategy[] strategies = {standard, surge, free};
        for (DeliveryFeeStrategy s : strategies) {
            assertNotNull(s.getName());
            double fee = s.computeFee(5.0, 300.0);
            assertTrue(fee >= 0.0);
        }
    }
}

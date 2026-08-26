package com.lld.elevator;

import com.lld.elevator.strategy.*;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class ElevatorDispatchStrategyFactoryTest {

    @Test
    public void resolvesEachPolicyToItsOwnStrategyImplementation() {
        LookScanDispatchStrategy lookScan = new LookScanDispatchStrategy();
        NearestCarDispatchStrategy nearestCar = new NearestCarDispatchStrategy();
        ElevatorDispatchStrategyFactory factory = new ElevatorDispatchStrategyFactory(lookScan, nearestCar);

        assertSame(lookScan, factory.forPolicy(DispatchPolicy.LOOK_SCAN));
        assertSame(nearestCar, factory.forPolicy(DispatchPolicy.NEAREST_CAR));
    }

    @Test
    public void everyDeclaredPolicyResolvesToSomething() {
        ElevatorDispatchStrategyFactory factory =
                new ElevatorDispatchStrategyFactory(new LookScanDispatchStrategy(), new NearestCarDispatchStrategy());
        for (DispatchPolicy policy : DispatchPolicy.values()) {
            assertNotNull(factory.forPolicy(policy), "policy " + policy + " must resolve to a strategy");
        }
    }
}

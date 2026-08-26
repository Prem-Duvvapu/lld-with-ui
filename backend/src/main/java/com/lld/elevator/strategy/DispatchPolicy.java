package com.lld.elevator.strategy;

/** The dispatch policies the controller can pick from; resolved to a strategy by the factory. */
public enum DispatchPolicy {
    /** LOOK/SCAN-style: favors a car already moving toward the call in the same direction, with distance + on-the-way penalty scoring. */
    LOOK_SCAN,
    /** Always the raw-closest available car by floor distance, ignoring direction of travel entirely. */
    NEAREST_CAR
}

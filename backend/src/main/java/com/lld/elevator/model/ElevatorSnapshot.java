package com.lld.elevator.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Immutable-in-practice read view of one {@link Elevator}, taken under its lock — safe to hand
 * to a JSON serializer or a sim event log without exposing the live, mutable car. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ElevatorSnapshot {
    private long id;
    private String name;
    private int currentFloor;
    private ElevatorState state;
    private Direction direction;
    private int occupancy;
    private int capacity;
    private List<Integer> upStops;
    private List<Integer> downStops;
}

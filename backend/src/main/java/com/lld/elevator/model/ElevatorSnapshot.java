package com.lld.elevator.model;

import java.util.List;

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

    public ElevatorSnapshot() {}

    public ElevatorSnapshot(long id, String name, int currentFloor, ElevatorState state, Direction direction, int occupancy, int capacity, List<Integer> upStops, List<Integer> downStops) {
        this.id = id;
        this.name = name;
        this.currentFloor = currentFloor;
        this.state = state;
        this.direction = direction;
        this.occupancy = occupancy;
        this.capacity = capacity;
        this.upStops = upStops;
        this.downStops = downStops;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getCurrentFloor() { return currentFloor; }
    public void setCurrentFloor(int currentFloor) { this.currentFloor = currentFloor; }

    public ElevatorState getState() { return state; }
    public void setState(ElevatorState state) { this.state = state; }

    public Direction getDirection() { return direction; }
    public void setDirection(Direction direction) { this.direction = direction; }

    public int getOccupancy() { return occupancy; }
    public void setOccupancy(int occupancy) { this.occupancy = occupancy; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public List<Integer> getUpStops() { return upStops; }
    public void setUpStops(List<Integer> upStops) { this.upStops = upStops; }

    public List<Integer> getDownStops() { return downStops; }
    public void setDownStops(List<Integer> downStops) { this.downStops = downStops; }
}

package com.elevator.model;

import java.util.ArrayList;
import java.util.List;

public class Elevator {

    private int id;
    private String name;
    private int currentFloor;
    private int destinationFloor;
    private Direction direction;
    private ElevatorStatus status;
    private int capacity;
    private int currentLoad;
    private List<Integer> pendingFloors;

    public Elevator() {
        this.direction = Direction.IDLE;
        this.status = ElevatorStatus.STOPPED;
        this.currentLoad = 0;
        this.pendingFloors = new ArrayList<>();
    }

    public Elevator(int id, String name, int capacity, int currentFloor) {
        this();
        this.id = id;
        this.name = name;
        this.capacity = capacity;
        this.currentFloor = currentFloor;
        this.destinationFloor = currentFloor;
    }

    public void addStop(int floor) {
        if (!pendingFloors.contains(floor)) {
            pendingFloors.add(floor);
        }
    }

    public void removeStop(int floor) {
        pendingFloors.remove(Integer.valueOf(floor));
    }

    public boolean isFull() {
        return currentLoad >= capacity;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getCurrentFloor() {
        return currentFloor;
    }

    public void setCurrentFloor(int currentFloor) {
        this.currentFloor = currentFloor;
    }

    public int getDestinationFloor() {
        return destinationFloor;
    }

    public void setDestinationFloor(int destinationFloor) {
        this.destinationFloor = destinationFloor;
    }

    public Direction getDirection() {
        return direction;
    }

    public void setDirection(Direction direction) {
        this.direction = direction;
    }

    public ElevatorStatus getStatus() {
        return status;
    }

    public void setStatus(ElevatorStatus status) {
        this.status = status;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public int getCurrentLoad() {
        return currentLoad;
    }

    public void setCurrentLoad(int currentLoad) {
        this.currentLoad = currentLoad;
    }

    public List<Integer> getPendingFloors() {
        return pendingFloors;
    }

    public void setPendingFloors(List<Integer> pendingFloors) {
        this.pendingFloors = pendingFloors;
    }
}

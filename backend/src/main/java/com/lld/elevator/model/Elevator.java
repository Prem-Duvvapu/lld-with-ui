package com.lld.elevator.model;

import com.lld.elevator.exception.IllegalElevatorStateTransitionException;
import com.lld.elevator.state.ElevatorLifecycleStates;

import java.util.*;
import java.util.concurrent.ConcurrentSkipListSet;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class Elevator {

    private long id;
    private String name;
    private volatile int currentFloor;
    private volatile int destinationFloor;
    private volatile Direction direction;
    private volatile ElevatorState state;
    private int capacity;
    private final AtomicInteger currentOccupancy = new AtomicInteger(0);

    // Concurrent skip list sets for LOOK/SCAN algorithm stops
    private final Set<Integer> upStops = new ConcurrentSkipListSet<>();
    private final Set<Integer> downStops = new ConcurrentSkipListSet<>(Collections.reverseOrder());

    private final ReentrantLock elevatorLock = new ReentrantLock(true);

    public Elevator() {
        this.direction = Direction.IDLE;
        this.state = ElevatorState.IDLE;
        this.currentFloor = 1;
        this.destinationFloor = 1;
        this.capacity = 8;
    }

    public Elevator(long id, String name, int capacity, int currentFloor) {
        this();
        this.id = id;
        this.name = name;
        this.capacity = capacity;
        this.currentFloor = currentFloor;
        this.destinationFloor = currentFloor;
    }

    public Elevator(int id, String name, int capacity, int currentFloor) {
        this((long) id, name, capacity, currentFloor);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
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

    public ElevatorState getState() {
        return state;
    }

    /**
     * Raw setter — bypasses the legal-transition table. Reserved for constructing test fixtures
     * and seeding initial state; production call sites should use {@link #transitionTo(ElevatorState)}.
     */
    public void setState(ElevatorState state) {
        this.state = state;
    }

    /**
     * Guarded transition: validates {@code target} against this elevator's current
     * {@link com.lld.elevator.state.ElevatorLifecycleState#allowedNext()} before applying it.
     * This is the one place production code should ever change {@link #state}.
     *
     * @throws IllegalElevatorStateTransitionException if {@code target} is not a legal next state
     */
    public void transitionTo(ElevatorState target) {
        if (!ElevatorLifecycleStates.of(this.state).canTransitionTo(target)) {
            throw new IllegalElevatorStateTransitionException(
                    "Elevator " + id + " (" + name + ") cannot transition from " + this.state + " to " + target);
        }
        this.state = target;
    }

    /**
     * The coarse-grained status the frontend renders. Previously collapsed {@code DOOR_OPEN} into
     * {@code STOPPED}, which meant the JSON contract could never actually tell a caller doors
     * were open — the frontend had to fake it with a client-side timer guess. Now that
     * {@link ElevatorState#DOOR_OPEN} is a real, guarded state, it is reported honestly.
     */
    public ElevatorStatus getStatus() {
        if (state == ElevatorState.MAINTENANCE) return ElevatorStatus.OUT_OF_ORDER;
        if (state == ElevatorState.MOVING_UP || state == ElevatorState.MOVING_DOWN) return ElevatorStatus.MOVING;
        if (state == ElevatorState.DOOR_OPEN) return ElevatorStatus.DOOR_OPEN;
        return ElevatorStatus.STOPPED;
    }

    public void setStatus(ElevatorStatus status) {
        if (status == ElevatorStatus.OUT_OF_ORDER) {
            this.state = ElevatorState.MAINTENANCE;
        } else if (status == ElevatorStatus.MOVING) {
            this.state = (direction == Direction.DOWN) ? ElevatorState.MOVING_DOWN : ElevatorState.MOVING_UP;
        } else {
            this.state = ElevatorState.IDLE;
        }
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public int getCurrentOccupancy() {
        return currentOccupancy.get();
    }

    public int getCurrentLoad() {
        return currentOccupancy.get();
    }

    public void setCurrentLoad(int load) {
        this.currentOccupancy.set(load);
    }

    public boolean boardPassenger() {
        elevatorLock.lock();
        try {
            if (currentOccupancy.get() < capacity) {
                currentOccupancy.incrementAndGet();
                return true;
            }
            return false;
        } finally {
            elevatorLock.unlock();
        }
    }

    public void deboardPassenger(int count) {
        elevatorLock.lock();
        try {
            int cur = currentOccupancy.get();
            currentOccupancy.set(Math.max(0, cur - count));
        } finally {
            elevatorLock.unlock();
        }
    }

    public boolean isFull() {
        return currentOccupancy.get() >= capacity;
    }

    public void addDestination(int floor) {
        addStop(floor);
    }

    public void addStop(int floor) {
        elevatorLock.lock();
        try {
            if (floor > currentFloor) {
                upStops.add(floor);
            } else if (floor < currentFloor) {
                downStops.add(floor);
            } else {
                if (direction == Direction.DOWN) {
                    downStops.add(floor);
                } else {
                    upStops.add(floor);
                }
            }
        } finally {
            elevatorLock.unlock();
        }
    }

    public void removeStop(int floor) {
        elevatorLock.lock();
        try {
            upStops.remove(floor);
            downStops.remove(floor);
        } finally {
            elevatorLock.unlock();
        }
    }

    public List<Integer> getPendingFloors() {
        elevatorLock.lock();
        try {
            List<Integer> list = new ArrayList<>();
            list.addAll(upStops);
            list.addAll(downStops);
            return list;
        } finally {
            elevatorLock.unlock();
        }
    }

    public Set<Integer> getUpStops() {
        return upStops;
    }

    public Set<Integer> getDownStops() {
        return downStops;
    }

    public ReentrantLock getLock() {
        return elevatorLock;
    }

    public ElevatorSnapshot createSnapshot() {
        return new ElevatorSnapshot(
            id, name, currentFloor, state, direction,
            currentOccupancy.get(), capacity,
            new ArrayList<>(upStops), new ArrayList<>(downStops)
        );
    }
}

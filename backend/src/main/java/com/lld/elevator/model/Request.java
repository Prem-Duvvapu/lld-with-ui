package com.lld.elevator.model;

import java.time.LocalDateTime;

public class Request {

    private long id;
    private int fromFloor;
    private int toFloor;
    private Direction direction;
    private String status;
    private int assignedElevatorId;
    private LocalDateTime timestamp;

    public Request() {
        this.timestamp = LocalDateTime.now();
        this.status = "PENDING";
    }

    public Request(int fromFloor, int toFloor) {
        this();
        this.fromFloor = fromFloor;
        this.toFloor = toFloor;
        this.direction = fromFloor < toFloor ? Direction.UP : Direction.DOWN;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public int getFromFloor() {
        return fromFloor;
    }

    public void setFromFloor(int fromFloor) {
        this.fromFloor = fromFloor;
    }

    public int getToFloor() {
        return toFloor;
    }

    public void setToFloor(int toFloor) {
        this.toFloor = toFloor;
    }

    public Direction getDirection() {
        return direction;
    }

    public void setDirection(Direction direction) {
        this.direction = direction;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getAssignedElevatorId() {
        return assignedElevatorId;
    }

    public void setAssignedElevatorId(int assignedElevatorId) {
        this.assignedElevatorId = assignedElevatorId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}

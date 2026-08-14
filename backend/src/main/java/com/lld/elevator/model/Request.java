package com.lld.elevator.model;

import java.time.LocalDateTime;

public class Request {

    private long id;
    private int sourceFloor;
    private int destinationFloor;
    private Direction direction;
    private RequestType type;
    private String status;
    private long assignedElevatorId;
    private long timestampEpoch;
    private LocalDateTime timestamp;

    public Request() {
        this.timestamp = LocalDateTime.now();
        this.timestampEpoch = System.currentTimeMillis();
        this.status = "PENDING";
        this.type = RequestType.EXTERNAL;
    }

    public Request(int sourceFloor, int destinationFloor) {
        this();
        this.sourceFloor = sourceFloor;
        this.destinationFloor = destinationFloor;
        this.direction = sourceFloor < destinationFloor ? Direction.UP : Direction.DOWN;
    }

    public Request(long id, int sourceFloor, int destinationFloor, Direction direction, RequestType type) {
        this(sourceFloor, destinationFloor);
        this.id = id;
        this.direction = direction;
        this.type = type;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public int getSourceFloor() { return sourceFloor; }
    public void setSourceFloor(int sourceFloor) { this.sourceFloor = sourceFloor; }

    public int getFromFloor() { return sourceFloor; }
    public void setFromFloor(int fromFloor) { this.sourceFloor = fromFloor; }

    public int getDestinationFloor() { return destinationFloor; }
    public void setDestinationFloor(int destinationFloor) { this.destinationFloor = destinationFloor; }

    public int getToFloor() { return destinationFloor; }
    public void setToFloor(int toFloor) { this.destinationFloor = toFloor; }

    public Direction getDirection() { return direction; }
    public void setDirection(Direction direction) { this.direction = direction; }

    public RequestType getType() { return type; }
    public void setType(RequestType type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getAssignedElevatorId() { return assignedElevatorId; }
    public void setAssignedElevatorId(long assignedElevatorId) { this.assignedElevatorId = assignedElevatorId; }
    public void setAssignedElevatorId(int assignedElevatorId) { this.assignedElevatorId = (long) assignedElevatorId; }

    public long getTimestampEpoch() { return timestampEpoch; }
    public void setTimestampEpoch(long timestampEpoch) { this.timestampEpoch = timestampEpoch; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}

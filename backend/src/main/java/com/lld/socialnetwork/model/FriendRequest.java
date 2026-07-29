package com.lld.socialnetwork.model;

public class FriendRequest {
    public enum Status { PENDING, ACCEPTED, REJECTED }

    private long id;
    private long fromUserId;
    private long toUserId;
    private Status status;

    public FriendRequest(long id, long fromUserId, long toUserId) {
        this.id = id;
        this.fromUserId = fromUserId;
        this.toUserId = toUserId;
        this.status = Status.PENDING;
    }

    public long getId() { return id; }
    public long getFromUserId() { return fromUserId; }
    public long getToUserId() { return toUserId; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}

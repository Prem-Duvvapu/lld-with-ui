package com.stackoverflow.model;

public class Vote {
    private String userId;
    private VoteType type;

    public Vote(String userId, VoteType type) {
        this.userId = userId;
        this.type = type;
    }

    public String getUserId() { return userId; }
    public VoteType getType() { return type; }
}

package com.lld.stockbroker.model;

public class User {
    private final String userId;
    private final String name;
    private final String email;
    private final String accountId;

    public User(String userId, String name, String email, String accountId) {
        this.userId = userId;
        this.name = name != null ? name.trim() : "User";
        this.email = email != null ? email.trim() : "";
        this.accountId = accountId;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getAccountId() {
        return accountId;
    }
}

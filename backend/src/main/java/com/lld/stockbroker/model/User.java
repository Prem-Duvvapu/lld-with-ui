package com.lld.stockbroker.model;

import lombok.Builder;
import lombok.Getter;

/** A registered trader — one {@link User} maps 1:1 to one {@link Account}. */
@Getter
@Builder
public class User {
    private final String userId;
    private final String name;
    private final String email;
    private final String accountId;

    public static User of(String userId, String name, String email, String accountId) {
        return User.builder()
                .userId(userId)
                .name(name != null ? name.trim() : "User")
                .email(email != null ? email.trim() : "")
                .accountId(accountId)
                .build();
    }
}

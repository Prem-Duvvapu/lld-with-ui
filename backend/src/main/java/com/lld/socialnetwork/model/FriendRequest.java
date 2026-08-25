package com.lld.socialnetwork.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequest {
    public enum Status { PENDING, ACCEPTED, REJECTED }

    private long id;
    private long fromUserId;
    private long toUserId;

    @Builder.Default
    private Status status = Status.PENDING;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}

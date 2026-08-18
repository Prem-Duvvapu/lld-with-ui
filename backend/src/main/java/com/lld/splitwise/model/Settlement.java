package com.lld.splitwise.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Settlement {
    private long id;
    private User fromUser;
    private User toUser;
    private double amount;
    private long groupId;
    private LocalDateTime timestamp;
}

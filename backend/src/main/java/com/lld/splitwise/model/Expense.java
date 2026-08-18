package com.lld.splitwise.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {
    private long id;
    private String description;
    private double amount;
    private User paidBy;
    private long groupId;
    private List<Split> splits;
    private LocalDateTime createdAt;
}

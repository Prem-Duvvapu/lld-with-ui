package com.lld.splitwise.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseEvent {
    private long id;
    private ExpenseEventType type;
    private String actor;
    private String description;
    private Map<String, Object> data;
    private Map<String, Double> balanceSnapshot;
    private LocalDateTime timestamp;
}

package com.lld.stackoverflow.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String username;
    private String email;
    @Builder.Default
    private int reputation = 1;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

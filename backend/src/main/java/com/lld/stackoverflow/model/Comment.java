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
public class Comment {
    private String id;
    private String body;
    private String authorId;
    private String authorName;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

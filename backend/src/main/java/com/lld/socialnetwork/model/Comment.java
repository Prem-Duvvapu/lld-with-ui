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
public class Comment {
    private long id;
    private long postId;
    private long authorId;
    private String content;
    private LocalDateTime timestamp;
}

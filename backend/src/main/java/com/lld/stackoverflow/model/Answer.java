package com.lld.stackoverflow.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** See {@link Question} for why this implements {@link Votable}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Answer implements Votable {
    private String id;
    private String body;
    private String authorId;
    private String authorName;
    private String questionId;
    @Builder.Default
    private boolean accepted = false;
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();
    @Builder.Default
    private Map<String, VoteType> votes = new ConcurrentHashMap<>();
    @Builder.Default
    private int score = 0;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public void addComment(Comment comment) {
        comments.add(comment);
    }
}

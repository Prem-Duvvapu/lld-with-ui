package com.lld.stackoverflow.model;

import java.time.LocalDateTime;

public class Comment {
    private String id;
    private String body;
    private String authorId;
    private String authorName;
    private LocalDateTime createdAt;

    public Comment(String id, String body, String authorId, String authorName) {
        this.id = id;
        this.body = body;
        this.authorId = authorId;
        this.authorName = authorName;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getBody() { return body; }
    public String getAuthorId() { return authorId; }
    public String getAuthorName() { return authorName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

package com.lld.socialnetwork.model;

import java.time.LocalDateTime;

public class Comment {
    private long id;
    private long postId;
    private long authorId;
    private String content;
    private LocalDateTime timestamp;

    public Comment(long id, long postId, long authorId, String content, LocalDateTime timestamp) {
        this.id = id;
        this.postId = postId;
        this.authorId = authorId;
        this.content = content;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public long getPostId() { return postId; }
    public long getAuthorId() { return authorId; }
    public String getContent() { return content; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

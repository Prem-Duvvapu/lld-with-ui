package com.lld.socialnetwork.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;

public class Post {
    private long id;
    private long authorId;
    private String content;
    private LocalDateTime timestamp;
    private Set<Long> likes;
    private List<Comment> comments;

    public Post(long id, long authorId, String content, LocalDateTime timestamp) {
        this.id = id;
        this.authorId = authorId;
        this.content = content;
        this.timestamp = timestamp;
        this.likes = new CopyOnWriteArraySet<>();
        this.comments = new CopyOnWriteArrayList<>();
    }

    public long getId() { return id; }
    public long getAuthorId() { return authorId; }
    public String getContent() { return content; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public Set<Long> getLikes() { return likes; }
    public List<Comment> getComments() { return comments; }

    public boolean addLike(long userId) {
        return likes.add(userId);
    }

    public boolean removeLike(long userId) {
        return likes.remove(userId);
    }

    public void addComment(Comment comment) {
        comments.add(comment);
    }
}

package com.lld.socialnetwork.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {
    private long id;
    private long authorId;
    private String content;
    private LocalDateTime timestamp;

    @Builder.Default
    private Set<Long> likes = new CopyOnWriteArraySet<>();

    @Builder.Default
    private List<Comment> comments = new CopyOnWriteArrayList<>();

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

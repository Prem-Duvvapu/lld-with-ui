package com.lld.socialnetwork.observer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One post-published broadcast fanned out to every {@link FeedObserver} subscribed to a
 * {@link FeedNotifier}. Carries enough detail (author, a content preview, and how many friends'
 * feeds were touched) that an observer never needs to look the post back up.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedEvent {
    private long postId;
    private long authorId;
    private String authorName;
    private String contentPreview;
    private int friendsNotified;
    private LocalDateTime timestamp;
}

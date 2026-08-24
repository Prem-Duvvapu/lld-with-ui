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

/**
 * A question is {@link Votable} so {@code VotingService} can apply vote and
 * reputation math to it with the exact same code path used for {@link Answer}.
 *
 * <p>{@code votes} remembers each voter's current {@link VoteType} so a repeat
 * vote is idempotent and a changed vote (upvote to downvote or back) applies
 * only the delta, never double-counts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question implements Votable {
    private String id;
    private String title;
    private String body;
    private String authorId;
    private String authorName;
    @Builder.Default
    private List<String> tags = new ArrayList<>();
    @Builder.Default
    private List<Answer> answers = new ArrayList<>();
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();
    @Builder.Default
    private Map<String, VoteType> votes = new ConcurrentHashMap<>();
    @Builder.Default
    private int viewCount = 0;
    @Builder.Default
    private int score = 0;
    @Builder.Default
    private QuestionStatus status = QuestionStatus.OPEN;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public void incrementView() {
        viewCount++;
    }

    public void addAnswer(Answer answer) {
        answers.add(answer);
    }

    public void addComment(Comment comment) {
        comments.add(comment);
    }
}

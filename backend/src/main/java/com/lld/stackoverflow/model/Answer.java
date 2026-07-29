package com.lld.stackoverflow.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Answer {
    private String id;
    private String body;
    private String authorId;
    private String authorName;
    private String questionId;
    private boolean accepted;
    private List<Comment> comments;
    private List<Vote> votes;
    private int score;
    private LocalDateTime createdAt;

    public Answer(String id, String body, String authorId, String authorName, String questionId) {
        this.id = id;
        this.body = body;
        this.authorId = authorId;
        this.authorName = authorName;
        this.questionId = questionId;
        this.accepted = false;
        this.comments = new ArrayList<>();
        this.votes = new ArrayList<>();
        this.score = 0;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getBody() { return body; }
    public String getAuthorId() { return authorId; }
    public String getAuthorName() { return authorName; }
    public String getQuestionId() { return questionId; }
    public boolean isAccepted() { return accepted; }
    public void setAccepted(boolean accepted) { this.accepted = accepted; }
    public List<Comment> getComments() { return comments; }
    public List<Vote> getVotes() { return votes; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void addComment(Comment comment) { comments.add(comment); }
    public void addVote(Vote vote) { votes.add(vote); }
}

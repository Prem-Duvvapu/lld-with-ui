package com.lld.stackoverflow.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Question {
    private String id;
    private String title;
    private String body;
    private String authorId;
    private String authorName;
    private List<String> tags;
    private List<Answer> answers;
    private List<Comment> comments;
    private List<Vote> votes;
    private int viewCount;
    private int score;
    private LocalDateTime createdAt;

    public Question(String id, String title, String body, String authorId, String authorName, List<String> tags) {
        this.id = id;
        this.title = title;
        this.body = body;
        this.authorId = authorId;
        this.authorName = authorName;
        this.tags = tags;
        this.answers = new ArrayList<>();
        this.comments = new ArrayList<>();
        this.votes = new ArrayList<>();
        this.viewCount = 0;
        this.score = 0;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getAuthorId() { return authorId; }
    public String getAuthorName() { return authorName; }
    public List<String> getTags() { return tags; }
    public List<Answer> getAnswers() { return answers; }
    public List<Comment> getComments() { return comments; }
    public List<Vote> getVotes() { return votes; }
    public int getViewCount() { return viewCount; }
    public void incrementView() { viewCount++; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void addAnswer(Answer answer) { answers.add(answer); }
    public void addComment(Comment comment) { comments.add(comment); }
    public void addVote(Vote vote) { votes.add(vote); }
}

package com.lld.stackoverflow.service;

import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import com.lld.stackoverflow.strategy.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StackOverflowService {

    private final StackOverflowRepository repository;

    public StackOverflowService(StackOverflowRepository repository) {
        this.repository = repository;
    }

    public List<Question> getQuestions(String keyword, String tag, String userId) {
        if (keyword == null && tag == null && userId == null) {
            return repository.getAllQuestions();
        }
        return repository.searchQuestions(keyword, tag, userId);
    }

    public Question getQuestion(String id) {
        Question q = repository.getQuestion(id);
        if (q == null) throw new IllegalArgumentException("Question not found");
        q.incrementView();
        return q;
    }

    public Question postQuestion(String title, String body, String authorId, List<String> tags) {
        User user = repository.getUser(authorId);
        if (user == null) throw new IllegalArgumentException("User not found");

        String qId = repository.generateQuestionId();
        Question question = new Question(qId, title, body, authorId, user.getUsername(), tags);
        repository.saveQuestion(question);

        user.setReputation(user.getReputation() + 5);
        return question;
    }

    public Answer postAnswer(String questionId, String body, String authorId) {
        Question q = repository.getQuestion(questionId);
        if (q == null) throw new IllegalArgumentException("Question not found");
        User user = repository.getUser(authorId);
        if (user == null) throw new IllegalArgumentException("User not found");

        String aId = repository.generateAnswerId();
        Answer answer = new Answer(aId, body, authorId, user.getUsername(), questionId);
        repository.saveAnswer(questionId, answer);

        user.setReputation(user.getReputation() + 10);
        return answer;
    }

    public Comment addComment(String targetType, String targetId, String body, String authorId) {
        User user = repository.getUser(authorId);
        if (user == null) throw new IllegalArgumentException("User not found");

        String cId = repository.generateCommentId();
        Comment comment = new Comment(cId, body, authorId, user.getUsername());

        if ("question".equalsIgnoreCase(targetType)) {
            Question q = repository.getQuestion(targetId);
            if (q == null) throw new IllegalArgumentException("Question not found");
            q.addComment(comment);
        } else if ("answer".equalsIgnoreCase(targetType)) {
            Answer a = repository.getAnswer(targetId);
            if (a == null) throw new IllegalArgumentException("Answer not found");
            a.addComment(comment);
        } else {
            throw new IllegalArgumentException("Invalid target type: " + targetType);
        }

        user.setReputation(user.getReputation() + 2);
        return comment;
    }

    public Question voteQuestion(String questionId, String userId, String voteTypeStr) {
        Question q = repository.getQuestion(questionId);
        if (q == null) throw new IllegalArgumentException("Question not found");
        User voter = repository.getUser(userId);
        if (voter == null) throw new IllegalArgumentException("User not found");

        VoteType voteType = VoteType.valueOf(voteTypeStr.toUpperCase());
        q.addVote(new Vote(userId, voteType));

        ReputationStrategy strategy = new QuestionReputationStrategy();
        int delta = strategy.calculateReputationChange(voteType);
        q.setScore(q.getScore() + (voteType == VoteType.UPVOTE ? 1 : -1));

        User author = repository.getUser(q.getAuthorId());
        if (author != null && !author.getId().equals(userId)) {
            author.setReputation(Math.max(1, author.getReputation() + delta));
        }

        return q;
    }

    public Answer voteAnswer(String answerId, String userId, String voteTypeStr) {
        Answer a = repository.getAnswer(answerId);
        if (a == null) throw new IllegalArgumentException("Answer not found");
        User voter = repository.getUser(userId);
        if (voter == null) throw new IllegalArgumentException("User not found");

        VoteType voteType = VoteType.valueOf(voteTypeStr.toUpperCase());
        a.addVote(new Vote(userId, voteType));

        ReputationStrategy strategy;
        int bonus = 0;
        if (a.isAccepted()) {
            strategy = new AcceptedAnswerReputationStrategy();
            bonus = strategy.calculateReputationChange(voteType);
        } else {
            strategy = new AnswerReputationStrategy();
        }
        int delta = strategy.calculateReputationChange(voteType) + bonus;
        a.setScore(a.getScore() + (voteType == VoteType.UPVOTE ? 1 : -1));

        User author = repository.getUser(a.getAuthorId());
        if (author != null && !author.getId().equals(userId)) {
            author.setReputation(Math.max(1, author.getReputation() + delta));
        }

        return a;
    }

    public Question acceptAnswer(String questionId, String answerId, String userId) {
        Question q = repository.getQuestion(questionId);
        if (q == null) throw new IllegalArgumentException("Question not found");
        if (!q.getAuthorId().equals(userId)) throw new IllegalArgumentException("Only question author can accept");

        for (Answer a : q.getAnswers()) a.setAccepted(false);

        Answer accepted = repository.getAnswer(answerId);
        if (accepted == null) throw new IllegalArgumentException("Answer not found");

        accepted.setAccepted(true);

        User answerAuthor = repository.getUser(accepted.getAuthorId());
        if (answerAuthor != null) {
            answerAuthor.setReputation(answerAuthor.getReputation() + 25);
        }

        return q;
    }

    public User getUser(String id) {
        User user = repository.getUser(id);
        if (user == null) throw new IllegalArgumentException("User not found");
        return user;
    }

    public List<Tag> getTags() { return repository.getAllTags(); }
    public List<User> getUsers() { return repository.getAllUsers(); }
}

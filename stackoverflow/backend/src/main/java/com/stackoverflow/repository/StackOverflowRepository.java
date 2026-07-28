package com.stackoverflow.repository;

import com.stackoverflow.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class StackOverflowRepository {

    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Question> questions = new ConcurrentHashMap<>();
    private final Map<String, Answer> answers = new ConcurrentHashMap<>();
    private final Map<String, Tag> tags = new LinkedHashMap<>();
    private final ReentrantLock lock = new ReentrantLock();
    private int questionCounter = 0;
    private int answerCounter = 0;
    private int commentCounter = 0;

    public void addTag(Tag tag) { tags.put(tag.getName(), tag); }
    public List<Tag> getAllTags() { return new ArrayList<>(tags.values()); }

    public void saveUser(User user) { users.put(user.getId(), user); }
    public User getUser(String id) { return users.get(id); }
    public List<User> getAllUsers() { return new ArrayList<>(users.values()); }

    public String generateQuestionId() { lock.lock(); try { questionCounter++; return "Q-" + questionCounter; } finally { lock.unlock(); } }
    public String generateAnswerId() { lock.lock(); try { answerCounter++; return "A-" + answerCounter; } finally { lock.unlock(); } }
    public String generateCommentId() { lock.lock(); try { commentCounter++; return "C-" + commentCounter; } finally { lock.unlock(); } }

    public void saveQuestion(Question q) { questions.put(q.getId(), q); }
    public Question getQuestion(String id) { return questions.get(id); }

    public void saveAnswer(String questionId, Answer a) {
        answers.put(a.getId(), a);
        Question q = questions.get(questionId);
        if (q != null) q.addAnswer(a);
    }

    public Answer getAnswer(String id) { return answers.get(id); }

    public List<Question> searchQuestions(String keyword, String tag, String userId) {
        return questions.values().stream()
                .filter(q -> {
                    if (keyword != null && !keyword.isBlank()) {
                        String k = keyword.toLowerCase();
                        boolean match = q.getTitle().toLowerCase().contains(k) || q.getBody().toLowerCase().contains(k);
                        if (!match) return false;
                    }
                    if (tag != null && !tag.isBlank()) {
                        if (q.getTags().stream().noneMatch(t -> t.equalsIgnoreCase(tag))) return false;
                    }
                    if (userId != null && !userId.isBlank()) {
                        if (!q.getAuthorId().equals(userId)) return false;
                    }
                    return true;
                })
                .sorted(Comparator.comparing(Question::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Question> getAllQuestions() {
        return questions.values().stream()
                .sorted(Comparator.comparing(Question::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }
}

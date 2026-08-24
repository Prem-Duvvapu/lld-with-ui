package com.lld.stackoverflow.repository;

import com.lld.stackoverflow.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

/**
 * In-memory store for the live module. One instance of this class is also built
 * standalone by {@code StackOverflowService} to back the isolated {@code /sim/*}
 * sandbox — see {@link #seed()}.
 *
 * <p>Lock ordering: {@link #postLock(String)} locks a {@link Question} or an
 * {@link Answer} (their ids are prefixed {@code Q-}/{@code A-} so the two never
 * collide in this map); {@link #userLock(String)} locks a {@link User}.
 * {@code VotingService} always acquires locks in the order
 * <strong>question &le; answer &le; user</strong> and never holds two locks of
 * the same kind at once, which is what makes concurrent votes and accepts
 * deadlock-free — see the javadoc on {@code VotingService} for the full proof.
 */
@Repository
public class StackOverflowRepository {

    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Question> questions = new ConcurrentHashMap<>();
    private final Map<String, Answer> answers = new ConcurrentHashMap<>();
    private final Map<String, Tag> tags = new ConcurrentHashMap<>();
    private final Map<String, ReentrantLock> postLocks = new ConcurrentHashMap<>();
    private final Map<String, ReentrantLock> userLocks = new ConcurrentHashMap<>();

    private final AtomicInteger questionCounter = new AtomicInteger(0);
    private final AtomicInteger answerCounter = new AtomicInteger(0);
    private final AtomicInteger commentCounter = new AtomicInteger(0);

    public ReentrantLock postLock(String postId) {
        return postLocks.computeIfAbsent(postId, k -> new ReentrantLock());
    }

    public ReentrantLock userLock(String userId) {
        return userLocks.computeIfAbsent(userId, k -> new ReentrantLock());
    }

    public void addTag(Tag tag) {
        tags.put(tag.getName().toLowerCase(), tag);
    }

    public List<Tag> getAllTags() {
        return tags.values().stream()
                .sorted(Comparator.comparing(Tag::getName))
                .collect(Collectors.toList());
    }

    public boolean tagExists(String name) {
        return name != null && tags.containsKey(name.toLowerCase());
    }

    public void saveUser(User user) {
        users.put(user.getId(), user);
    }

    public User getUser(String id) {
        return users.get(id);
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    public String generateQuestionId() {
        return "Q-" + questionCounter.incrementAndGet();
    }

    public String generateAnswerId() {
        return "A-" + answerCounter.incrementAndGet();
    }

    public String generateCommentId() {
        return "C-" + commentCounter.incrementAndGet();
    }

    public void saveQuestion(Question q) {
        questions.put(q.getId(), q);
    }

    public Question getQuestion(String id) {
        return questions.get(id);
    }

    public void saveAnswer(String questionId, Answer a) {
        answers.put(a.getId(), a);
        Question q = questions.get(questionId);
        if (q != null) {
            q.addAnswer(a);
        }
    }

    public Answer getAnswer(String id) {
        return answers.get(id);
    }

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

    /**
     * Wipes and reseeds this store. Used both by the live module's
     * {@code StackOverflowInitializer} at boot and by the sim sandbox's
     * {@code simReset} — the two call it on separate {@code StackOverflowRepository}
     * instances, so the demo can never touch live data.
     */
    public void seed() {
        users.clear();
        questions.clear();
        answers.clear();
        tags.clear();
        postLocks.clear();
        userLocks.clear();
        questionCounter.set(0);
        answerCounter.set(0);
        commentCounter.set(0);

        addTag(new Tag("java", "Java programming language"));
        addTag(new Tag("spring", "Spring Framework"));
        addTag(new Tag("javascript", "JavaScript language"));
        addTag(new Tag("python", "Python programming language"));
        addTag(new Tag("react", "React library"));
        addTag(new Tag("docker", "Containerization"));
        addTag(new Tag("sql", "SQL databases"));
        addTag(new Tag("design-patterns", "Software design patterns"));

        User alice = User.builder().id("U1").username("alice").email("alice@example.com").reputation(150).build();
        User bob = User.builder().id("U2").username("bob").email("bob@example.com").reputation(85).build();
        User charlie = User.builder().id("U3").username("charlie").email("charlie@example.com").reputation(42).build();
        saveUser(alice);
        saveUser(bob);
        saveUser(charlie);

        Question q1 = Question.builder()
                .id("Q-1").title("How to use Strategy Pattern in Java?")
                .body("I want to implement the Strategy pattern for a payment system. Can someone explain with an example?")
                .authorId("U1").authorName("alice")
                .tags(List.of("java", "design-patterns"))
                .score(12)
                .status(QuestionStatus.ANSWERED)
                .build();
        saveQuestion(q1);

        Question q2 = Question.builder()
                .id("Q-2").title("Spring Boot vs Spring MVC: What's the difference?")
                .body("I'm confused between Spring Boot and Spring MVC. Are they the same thing?")
                .authorId("U2").authorName("bob")
                .tags(List.of("spring", "java"))
                .score(8)
                .build();
        saveQuestion(q2);

        Question q3 = Question.builder()
                .id("Q-3").title("How to handle concurrent requests in Java?")
                .body("What are the best practices for handling concurrent requests in a Java web application?")
                .authorId("U3").authorName("charlie")
                .tags(List.of("java", "spring"))
                .score(5)
                .build();
        saveQuestion(q3);

        questionCounter.set(3);

        Answer a1 = Answer.builder()
                .id("A-1").body("The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime.")
                .authorId("U2").authorName("bob").questionId("Q-1")
                .score(8).accepted(true)
                .build();
        saveAnswer("Q-1", a1);
        bob.setReputation(bob.getReputation() + 15);

        Answer a2 = Answer.builder()
                .id("A-2").body("Spring Boot is an opinionated version of Spring that removes most of the boilerplate configuration.")
                .authorId("U1").authorName("alice").questionId("Q-2")
                .score(5)
                .build();
        saveAnswer("Q-2", a2);

        answerCounter.set(2);
    }
}

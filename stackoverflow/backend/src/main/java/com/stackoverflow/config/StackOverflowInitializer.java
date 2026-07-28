package com.stackoverflow.config;

import com.stackoverflow.model.*;
import com.stackoverflow.repository.StackOverflowRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StackOverflowInitializer implements CommandLineRunner {

    private final StackOverflowRepository repository;

    public StackOverflowInitializer(StackOverflowRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        repository.addTag(new Tag("java", "Java programming language"));
        repository.addTag(new Tag("spring", "Spring Framework"));
        repository.addTag(new Tag("javascript", "JavaScript language"));
        repository.addTag(new Tag("python", "Python programming language"));
        repository.addTag(new Tag("react", "React library"));
        repository.addTag(new Tag("docker", "Containerization"));
        repository.addTag(new Tag("sql", "SQL databases"));
        repository.addTag(new Tag("design-patterns", "Software design patterns"));

        User alice = new User("U1", "alice", "alice@example.com");
        alice.setReputation(150);
        User bob = new User("U2", "bob", "bob@example.com");
        bob.setReputation(85);
        User charlie = new User("U3", "charlie", "charlie@example.com");
        charlie.setReputation(42);
        repository.saveUser(alice);
        repository.saveUser(bob);
        repository.saveUser(charlie);

        Question q1 = new Question("Q-1", "How to use Strategy Pattern in Java?",
                "I want to implement the Strategy pattern for a payment system. Can someone explain with an example?",
                "U1", "alice", List.of("java", "design-patterns"));
        q1.setScore(12);
        repository.saveQuestion(q1);

        Question q2 = new Question("Q-2", "Spring Boot vs Spring MVC: What's the difference?",
                "I'm confused between Spring Boot and Spring MVC. Are they the same thing?",
                "U2", "bob", List.of("spring", "java"));
        q2.setScore(8);
        repository.saveQuestion(q2);

        Question q3 = new Question("Q-3", "How to handle concurrent requests in Java?",
                "What are the best practices for handling concurrent requests in a Java web application?",
                "U3", "charlie", List.of("java", "spring"));
        q3.setScore(5);
        repository.saveQuestion(q3);

        Answer a1 = new Answer("A-1", "The Strategy pattern defines a family of algorithms...",
                "U2", "bob", "Q-1");
        a1.setScore(8);
        a1.setAccepted(true);
        repository.saveAnswer("Q-1", a1);
        bob.setReputation(bob.getReputation() + 25);

        Answer a2 = new Answer("A-2", "Spring Boot is an opinionated version of Spring...",
                "U1", "alice", "Q-2");
        a2.setScore(5);
        repository.saveAnswer("Q-2", a2);
    }
}

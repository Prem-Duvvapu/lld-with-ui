package com.stackoverflow.controller;

import com.stackoverflow.model.*;
import com.stackoverflow.service.StackOverflowService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stackoverflow")
@CrossOrigin(origins = "*")
public class StackOverflowController {

    private final StackOverflowService service;

    public StackOverflowController(StackOverflowService service) {
        this.service = service;
    }

    @GetMapping("/questions")
    public List<Question> getQuestions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String userId) {
        return service.getQuestions(keyword, tag, userId);
    }

    @GetMapping("/questions/{id}")
    public ResponseEntity<?> getQuestion(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getQuestion(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/questions")
    public ResponseEntity<?> postQuestion(@RequestBody Map<String, Object> body) {
        try {
            String title = (String) body.get("title");
            String content = (String) body.get("body");
            String authorId = (String) body.get("authorId");
            List<String> tags = (List<String>) body.get("tags");
            return ResponseEntity.ok(service.postQuestion(title, content, authorId, tags));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/questions/{id}/answers")
    public ResponseEntity<?> postAnswer(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.postAnswer(id, body.get("body"), body.get("authorId")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/questions/{id}/vote")
    public ResponseEntity<?> voteQuestion(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.voteQuestion(id, body.get("userId"), body.get("voteType")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/questions/{id}/accept")
    public ResponseEntity<?> acceptAnswer(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.acceptAnswer(id, body.get("answerId"), body.get("userId")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/answers/{id}/vote")
    public ResponseEntity<?> voteAnswer(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.voteAnswer(id, body.get("userId"), body.get("voteType")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/comments")
    public ResponseEntity<?> addComment(@RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.addComment(
                    body.get("targetType"), body.get("targetId"),
                    body.get("body"), body.get("authorId")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUser(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getUser(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tags")
    public List<Tag> getTags() { return service.getTags(); }

    @GetMapping("/users")
    public List<User> getUsers() { return service.getUsers(); }
}

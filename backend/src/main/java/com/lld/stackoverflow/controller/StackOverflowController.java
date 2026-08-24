package com.lld.stackoverflow.controller;

import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.service.StackOverflowService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Translates HTTP only — every rule lives in {@code StackOverflowService} /
 * {@code VotingService}. Domain failures propagate as {@code DomainException}s
 * and are turned into status codes by {@code GlobalExceptionHandler}; no
 * controller-level try/catch here.
 */
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
    public Question getQuestion(@PathVariable String id) {
        return service.getQuestion(id);
    }

    @PostMapping("/questions")
    @SuppressWarnings("unchecked")
    public Question postQuestion(@RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String content = (String) body.get("body");
        String authorId = (String) body.get("authorId");
        List<String> tags = (List<String>) body.get("tags");
        return service.postQuestion(title, content, authorId, tags);
    }

    @PostMapping("/questions/{id}/answers")
    public Answer postAnswer(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.postAnswer(id, body.get("body"), body.get("authorId"));
    }

    @PostMapping("/questions/{id}/vote")
    public Question voteQuestion(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.voteQuestion(id, body.get("userId"), body.get("voteType"));
    }

    @PostMapping("/questions/{id}/accept")
    public Question acceptAnswer(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.acceptAnswer(id, body.get("answerId"), body.get("userId"));
    }

    @PostMapping("/questions/{id}/close")
    public Question closeQuestion(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.closeQuestion(id, body.get("userId"));
    }

    @PostMapping("/answers/{id}/vote")
    public Answer voteAnswer(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.voteAnswer(id, body.get("userId"), body.get("voteType"));
    }

    @PostMapping("/comments")
    public Comment addComment(@RequestBody Map<String, String> body) {
        VoteTargetType targetType = VoteTargetType.valueOf(body.get("targetType").toUpperCase(Locale.ROOT));
        return service.addComment(targetType, body.get("targetId"), body.get("body"), body.get("authorId"));
    }

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable String id) {
        return service.getUser(id);
    }

    @GetMapping("/tags")
    public List<Tag> getTags() {
        return service.getTags();
    }

    @GetMapping("/users")
    public List<User> getUsers() {
        return service.getUsers();
    }

    // ------------------------------------------------------------------
    // Simulation sandbox — isolated from the endpoints above
    // ------------------------------------------------------------------

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, String>> simReset() {
        service.simReset();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @GetMapping("/sim/state")
    public Map<String, Object> simState() {
        return service.simState();
    }

    @PostMapping("/sim/ask")
    public Question simAsk() {
        return service.simAsk();
    }

    @PostMapping("/sim/answer")
    public Answer simAnswer(@RequestBody Map<String, String> body) {
        return service.simAnswer(body.get("questionId"));
    }

    @PostMapping("/sim/vote")
    public Answer simVote(@RequestBody Map<String, String> body) {
        return service.simVoteAnswer(body.get("answerId"), body.get("voterId"), body.get("voteType"));
    }

    @PostMapping("/sim/accept")
    public Question simAccept(@RequestBody Map<String, String> body) {
        return service.simAccept(body.get("questionId"), body.get("answerId"), body.get("requesterId"));
    }

    @PostMapping("/sim/close")
    public Question simClose(@RequestBody Map<String, String> body) {
        return service.simClose(body.get("questionId"), body.get("requesterId"));
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) {
        String answerId = (String) body.get("answerId");
        int voters = body.get("voters") == null ? 5 : ((Number) body.get("voters")).intValue();
        return service.simRace(answerId, voters);
    }

    @GetMapping("/sim/events")
    public List<StackOverflowEvent> simEvents() {
        return service.simEvents();
    }
}

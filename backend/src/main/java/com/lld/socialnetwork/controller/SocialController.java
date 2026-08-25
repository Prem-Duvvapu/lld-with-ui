package com.lld.socialnetwork.controller;

import com.lld.socialnetwork.model.*;
import com.lld.socialnetwork.observer.FeedEvent;
import com.lld.socialnetwork.service.SocialService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Translates HTTP only — every call delegates straight to {@link SocialService}. Domain
 * failures (unknown user/post/request, duplicate friend request, already friends, ...) are
 * thrown as typed {@code SocialException} subclasses and turned into the right status code by
 * the shared {@code GlobalExceptionHandler}; no per-endpoint try/catch needed.
 */
@RestController
@RequestMapping("/api/social")
@CrossOrigin(origins = "*")
public class SocialController {

    private final SocialService service;

    public SocialController(SocialService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.createUser(body.get("name"), body.get("email"), body.get("bio")));
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return service.getAllUsers();
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable long id) {
        return ResponseEntity.ok(service.getUser(id));
    }

    @PostMapping("/friends/request")
    public ResponseEntity<FriendRequest> sendFriendRequest(@RequestBody Map<String, Long> body) {
        return ResponseEntity.ok(service.sendFriendRequest(body.get("fromUserId"), body.get("toUserId")));
    }

    @PutMapping("/friends/respond/{requestId}")
    public ResponseEntity<FriendRequest> respondToRequest(@PathVariable long requestId, @RequestParam boolean accept) {
        return ResponseEntity.ok(service.respondToRequest(requestId, accept));
    }

    @GetMapping("/friends/{userId}")
    public ResponseEntity<List<User>> getFriends(@PathVariable long userId) {
        return ResponseEntity.ok(service.getFriends(userId));
    }

    @GetMapping("/requests/{userId}")
    public ResponseEntity<List<FriendRequest>> getPendingRequests(@PathVariable long userId) {
        return ResponseEntity.ok(service.getPendingRequests(userId));
    }

    @PostMapping("/posts")
    public ResponseEntity<Post> createPost(@RequestBody Map<String, Object> body) {
        long userId = ((Number) body.get("userId")).longValue();
        String content = (String) body.get("content");
        return ResponseEntity.ok(service.createPost(userId, content));
    }

    @GetMapping("/feed/{userId}")
    public ResponseEntity<List<Post>> getFeed(@PathVariable long userId) {
        return ResponseEntity.ok(service.getFeed(userId));
    }

    @GetMapping("/posts")
    public List<Post> getAllPosts() {
        return service.getAllPosts();
    }

    @GetMapping("/feed-events")
    public ResponseEntity<List<FeedEvent>> getFeedEvents() {
        return ResponseEntity.ok(service.getFeedEvents());
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Map<String, String>> likePost(@PathVariable long postId, @RequestBody Map<String, Long> body) {
        service.likePost(postId, body.get("userId"));
        return ResponseEntity.ok(Map.of("message", "Liked"));
    }

    @PostMapping("/posts/{postId}/comment")
    public ResponseEntity<Comment> addComment(@PathVariable long postId, @RequestBody Map<String, Object> body) {
        long userId = ((Number) body.get("userId")).longValue();
        String content = (String) body.get("content");
        return ResponseEntity.ok(service.addComment(postId, userId, content));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/users")
    public ResponseEntity<Map<String, Object>> simCreateUser(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String email = (String) body.get("email");
        String bio = (String) body.get("bio");
        int step = ((Number) body.getOrDefault("step", 2)).intValue();
        return ResponseEntity.ok(service.simCreateUser(name, email, bio, step));
    }

    @PostMapping("/sim/posts")
    public ResponseEntity<Map<String, Object>> simCreatePost(@RequestBody Map<String, Object> body) {
        long userId = ((Number) body.get("userId")).longValue();
        String content = (String) body.get("content");
        int step = ((Number) body.getOrDefault("step", 5)).intValue();
        return ResponseEntity.ok(service.simCreatePost(userId, content, step));
    }

    @PostMapping("/sim/friends/request")
    public ResponseEntity<Map<String, Object>> simSendFriendRequest(@RequestBody Map<String, Object> body) {
        long fromUserId = ((Number) body.get("fromUserId")).longValue();
        long toUserId = ((Number) body.get("toUserId")).longValue();
        int step = ((Number) body.getOrDefault("step", 3)).intValue();
        return ResponseEntity.ok(service.simSendFriendRequest(fromUserId, toUserId, step));
    }

    @PostMapping("/sim/friends/respond/{requestId}")
    public ResponseEntity<Map<String, Object>> simRespond(@PathVariable long requestId,
                                                            @RequestBody Map<String, Object> body) {
        boolean accept = Boolean.TRUE.equals(body.get("accept"));
        int step = ((Number) body.getOrDefault("step", 4)).intValue();
        return ResponseEntity.ok(service.simRespond(requestId, accept, step));
    }

    @PostMapping("/sim/posts/{postId}/like")
    public ResponseEntity<Map<String, Object>> simLikePost(@PathVariable long postId, @RequestBody Map<String, Object> body) {
        long userId = ((Number) body.get("userId")).longValue();
        int step = ((Number) body.getOrDefault("step", 6)).intValue();
        return ResponseEntity.ok(service.simLikePost(postId, userId, step));
    }

    @PostMapping("/sim/posts/{postId}/comment")
    public ResponseEntity<Map<String, Object>> simAddComment(@PathVariable long postId, @RequestBody Map<String, Object> body) {
        long userId = ((Number) body.get("userId")).longValue();
        String content = (String) body.get("content");
        int step = ((Number) body.getOrDefault("step", 6)).intValue();
        return ResponseEntity.ok(service.simAddComment(postId, userId, content, step));
    }

    @PostMapping("/sim/race")
    public ResponseEntity<Map<String, Object>> simRace(@RequestBody Map<String, Object> body) {
        long userId1 = ((Number) body.get("userId1")).longValue();
        long userId2 = ((Number) body.get("userId2")).longValue();
        int attempts = ((Number) body.getOrDefault("attempts", 8)).intValue();
        int step = ((Number) body.getOrDefault("step", 8)).intValue();
        return ResponseEntity.ok(service.simRaceFriendRequests(userId1, userId2, attempts, step));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @GetMapping("/sim/snapshot")
    public ResponseEntity<Map<String, Object>> simGetSnapshot() {
        return ResponseEntity.ok(service.getSimSnapshot());
    }
}

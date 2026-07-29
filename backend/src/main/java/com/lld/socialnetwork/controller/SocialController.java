package com.lld.socialnetwork.controller;

import com.lld.socialnetwork.model.*;
import com.lld.socialnetwork.service.SocialService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/social")
@CrossOrigin(origins = "*")
public class SocialController {

    private final SocialService service;

    public SocialController(SocialService service) {
        this.service = service;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        try {
            User user = service.createUser(body.get("name"), body.get("email"), body.get("bio"));
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return service.getAllUsers();
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUser(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.getUser(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/friends/request")
    public ResponseEntity<?> sendFriendRequest(@RequestBody Map<String, Long> body) {
        try {
            FriendRequest req = service.sendFriendRequest(body.get("fromUserId"), body.get("toUserId"));
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/friends/respond/{requestId}")
    public ResponseEntity<?> respondToRequest(@PathVariable long requestId, @RequestParam boolean accept) {
        try {
            service.respondToRequest(requestId, accept);
            return ResponseEntity.ok(Map.of("message", "Request " + (accept ? "accepted" : "rejected")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/friends/{userId}")
    public ResponseEntity<?> getFriends(@PathVariable long userId) {
        try {
            return ResponseEntity.ok(service.getFriends(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/requests/{userId}")
    public ResponseEntity<?> getPendingRequests(@PathVariable long userId) {
        try {
            return ResponseEntity.ok(service.getPendingRequests(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/posts")
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> body) {
        try {
            long userId = ((Number) body.get("userId")).longValue();
            String content = (String) body.get("content");
            Post post = service.createPost(userId, content);
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/feed/{userId}")
    public ResponseEntity<?> getFeed(@PathVariable long userId) {
        try {
            return ResponseEntity.ok(service.getFeed(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/posts")
    public List<Post> getAllPosts() {
        return service.getAllPosts();
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<?> likePost(@PathVariable long postId, @RequestBody Map<String, Long> body) {
        try {
            service.likePost(postId, body.get("userId"));
            return ResponseEntity.ok(Map.of("message", "Liked"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/comment")
    public ResponseEntity<?> addComment(@PathVariable long postId, @RequestBody Map<String, Object> body) {
        try {
            long userId = ((Number) body.get("userId")).longValue();
            String content = (String) body.get("content");
            Comment comment = service.addComment(postId, userId, content);
            return ResponseEntity.ok(comment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

package com.lld.socialnetwork.service;

import com.lld.socialnetwork.model.*;
import com.lld.socialnetwork.repository.SocialRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class SocialService {

    private final SocialRepository repository;

    public SocialService(SocialRepository repository) {
        this.repository = repository;
    }

    public User createUser(String name, String email, String bio) {
        return repository.saveUser(name, email, bio);
    }

    public User getUser(long id) {
        return repository.getUser(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    public List<User> getAllUsers() {
        return repository.getAllUsers();
    }

    public Post createPost(long userId, String content) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        if (content == null || content.trim().isEmpty())
            throw new IllegalArgumentException("Content cannot be empty");
        return repository.createPost(userId, content);
    }

    public List<Post> getFeed(long userId) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        return repository.getFeed(userId);
    }

    public List<Post> getAllPosts() {
        return repository.getAllPosts();
    }

    public Comment addComment(long postId, long userId, String content) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        if (content == null || content.trim().isEmpty())
            throw new IllegalArgumentException("Content cannot be empty");
        Comment comment = repository.addComment(postId, userId, content);
        if (comment == null)
            throw new IllegalArgumentException("Post not found: " + postId);
        return comment;
    }

    public void likePost(long postId, long userId) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        boolean liked = repository.likePost(postId, userId);
        if (!liked)
            throw new IllegalArgumentException("Post not found: " + postId);
    }

    public FriendRequest sendFriendRequest(long fromUserId, long toUserId) {
        if (fromUserId == toUserId)
            throw new IllegalArgumentException("Cannot send friend request to yourself");
        if (!repository.getUser(fromUserId).isPresent())
            throw new IllegalArgumentException("Sender not found: " + fromUserId);
        if (!repository.getUser(toUserId).isPresent())
            throw new IllegalArgumentException("Receiver not found: " + toUserId);
        if (repository.areFriends(fromUserId, toUserId))
            throw new IllegalArgumentException("Already friends");
        if (repository.hasPendingRequest(fromUserId, toUserId))
            throw new IllegalArgumentException("Friend request already pending");
        return repository.sendFriendRequest(fromUserId, toUserId);
    }

    public void respondToRequest(long requestId, boolean accept) {
        FriendRequest req = repository.getFriendRequest(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found: " + requestId));
        if (req.getStatus() != FriendRequest.Status.PENDING)
            throw new IllegalArgumentException("Request already " + req.getStatus());
        if (accept) {
            repository.acceptFriendRequest(requestId);
        } else {
            repository.rejectFriendRequest(requestId);
        }
    }

    public List<FriendRequest> getPendingRequests(long userId) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        return repository.getPendingRequests(userId);
    }

    public List<User> getFriends(long userId) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        return repository.getFriends(userId);
    }

    public Set<Long> getFriendIds(long userId) {
        if (!repository.getUser(userId).isPresent())
            throw new IllegalArgumentException("User not found: " + userId);
        return repository.getFriendIds(userId);
    }
}

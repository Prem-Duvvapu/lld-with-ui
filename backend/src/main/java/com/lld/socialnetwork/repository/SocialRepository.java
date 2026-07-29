package com.lld.socialnetwork.repository;

import com.lld.socialnetwork.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class SocialRepository {

    private final Map<Long, User> users = new ConcurrentHashMap<>();
    private final Map<Long, Post> posts = new ConcurrentHashMap<>();
    private final Map<Long, FriendRequest> friendRequests = new ConcurrentHashMap<>();
    private final Map<Long, Set<Long>> friendships = new ConcurrentHashMap<>();

    private final AtomicLong userIdCounter = new AtomicLong(1);
    private final AtomicLong postIdCounter = new AtomicLong(1);
    private final AtomicLong commentIdCounter = new AtomicLong(1);
    private final AtomicLong requestIdCounter = new AtomicLong(1);

    public User saveUser(String name, String email, String bio) {
        long id = userIdCounter.getAndIncrement();
        User user = new User(id, name, email, bio);
        users.put(id, user);
        friendships.put(id, ConcurrentHashMap.newKeySet());
        return user;
    }

    public Optional<User> getUser(long id) {
        return Optional.ofNullable(users.get(id));
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    public Post createPost(long authorId, String content) {
        long id = postIdCounter.getAndIncrement();
        Post post = new Post(id, authorId, content, java.time.LocalDateTime.now());
        posts.put(id, post);
        return post;
    }

    public Optional<Post> getPost(long postId) {
        return Optional.ofNullable(posts.get(postId));
    }

    public List<Post> getAllPosts() {
        return posts.values().stream()
                .sorted(Comparator.comparing(Post::getTimestamp).reversed())
                .collect(Collectors.toList());
    }

    public List<Post> getFeed(long userId) {
        Set<Long> visible = new HashSet<>();
        visible.add(userId);
        Set<Long> friends = friendships.get(userId);
        if (friends != null) visible.addAll(friends);
        return posts.values().stream()
                .filter(p -> visible.contains(p.getAuthorId()))
                .sorted(Comparator.comparing(Post::getTimestamp).reversed())
                .collect(Collectors.toList());
    }

    public Comment addComment(long postId, long authorId, String content) {
        Post post = posts.get(postId);
        if (post == null) return null;
        long id = commentIdCounter.getAndIncrement();
        Comment comment = new Comment(id, postId, authorId, content, java.time.LocalDateTime.now());
        post.addComment(comment);
        return comment;
    }

    public boolean likePost(long postId, long userId) {
        Post post = posts.get(postId);
        if (post == null) return false;
        return post.addLike(userId);
    }

    public boolean unlikePost(long postId, long userId) {
        Post post = posts.get(postId);
        if (post == null) return false;
        return post.removeLike(userId);
    }

    public FriendRequest sendFriendRequest(long fromUserId, long toUserId) {
        long id = requestIdCounter.getAndIncrement();
        FriendRequest request = new FriendRequest(id, fromUserId, toUserId);
        friendRequests.put(id, request);
        return request;
    }

    public Optional<FriendRequest> getFriendRequest(long requestId) {
        return Optional.ofNullable(friendRequests.get(requestId));
    }

    public List<FriendRequest> getPendingRequests(long userId) {
        return friendRequests.values().stream()
                .filter(r -> r.getToUserId() == userId && r.getStatus() == FriendRequest.Status.PENDING)
                .sorted(Comparator.comparing(FriendRequest::getId))
                .collect(Collectors.toList());
    }

    public List<FriendRequest> getSentRequests(long userId) {
        return friendRequests.values().stream()
                .filter(r -> r.getFromUserId() == userId)
                .sorted(Comparator.comparing(FriendRequest::getId))
                .collect(Collectors.toList());
    }

    public void acceptFriendRequest(long requestId) {
        FriendRequest req = friendRequests.get(requestId);
        if (req != null) {
            req.setStatus(FriendRequest.Status.ACCEPTED);
            friendships.get(req.getFromUserId()).add(req.getToUserId());
            friendships.get(req.getToUserId()).add(req.getFromUserId());
        }
    }

    public void rejectFriendRequest(long requestId) {
        FriendRequest req = friendRequests.get(requestId);
        if (req != null) {
            req.setStatus(FriendRequest.Status.REJECTED);
        }
    }

    public Set<Long> getFriendIds(long userId) {
        return friendships.getOrDefault(userId, Collections.emptySet());
    }

    public List<User> getFriends(long userId) {
        Set<Long> ids = getFriendIds(userId);
        return ids.stream()
                .map(users::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public boolean areFriends(long userId1, long userId2) {
        Set<Long> friends = friendships.get(userId1);
        return friends != null && friends.contains(userId2);
    }

    public boolean hasPendingRequest(long fromUserId, long toUserId) {
        return friendRequests.values().stream()
                .anyMatch(r -> r.getFromUserId() == fromUserId && r.getToUserId() == toUserId
                        && r.getStatus() == FriendRequest.Status.PENDING);
    }
}

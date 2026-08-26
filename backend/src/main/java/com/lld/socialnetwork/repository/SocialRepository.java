package com.lld.socialnetwork.repository;

import com.lld.socialnetwork.model.*;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * In-memory store for the social graph, posts and friend requests. Backed entirely by
 * {@link ConcurrentHashMap}s so simple reads/writes never need external locking — the
 * check-then-act sequences that DO need a lock (send/accept a friend request between the
 * same pair) are guarded by {@code SocialService}'s canonical pair lock, not here.
 *
 * <p>The no-arg constructor seeds a handful of demo users, a friendship and a post, the same
 * "constructor seeds demo data" idiom as {@code InventoryRepository} — used both by the live
 * Spring-managed singleton and by {@code SocialService} to build a fresh, fully isolated
 * {@code /sim/*} sandbox on every reset.
 */
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

    public SocialRepository() {
        User alice = saveUser("Alice Chen", "alice@example.com", "Product designer, coffee enthusiast");
        User bob = saveUser("Bob Martinez", "bob@example.com", "Backend engineer");
        saveUser("Carol Singh", "carol@example.com", "Photographer");
        makeFriends(alice.getId(), bob.getId());
        createPost(alice.getId(), "Just shipped the new onboarding flow! 🎉");
        createPost(bob.getId(), "Anyone else deep in a Sunday debugging session?");
    }

    // ------------------------------------------------------------- users

    public User saveUser(String name, String email, String bio) {
        long id = userIdCounter.getAndIncrement();
        User user = User.builder().id(id).name(name).email(email).bio(bio).build();
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

    // ------------------------------------------------------------- posts

    public Post createPost(long authorId, String content) {
        long id = postIdCounter.getAndIncrement();
        Post post = Post.builder().id(id).authorId(authorId).content(content).timestamp(LocalDateTime.now()).build();
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
        Comment comment = Comment.builder().id(id).postId(postId).authorId(authorId).content(content)
                .timestamp(LocalDateTime.now()).build();
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

    // ------------------------------------------------------------- friend requests

    public FriendRequest sendFriendRequest(long fromUserId, long toUserId) {
        long id = requestIdCounter.getAndIncrement();
        FriendRequest request = FriendRequest.builder()
                .id(id).fromUserId(fromUserId).toUserId(toUserId)
                .status(FriendRequest.Status.PENDING).timestamp(LocalDateTime.now()).build();
        friendRequests.put(id, request);
        return request;
    }

    public Optional<FriendRequest> getFriendRequest(long requestId) {
        return Optional.ofNullable(friendRequests.get(requestId));
    }

    public List<FriendRequest> getAllFriendRequests() {
        return friendRequests.values().stream()
                .sorted(Comparator.comparing(FriendRequest::getId))
                .collect(Collectors.toList());
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
            makeFriends(req.getFromUserId(), req.getToUserId());
        }
    }

    public void rejectFriendRequest(long requestId) {
        FriendRequest req = friendRequests.get(requestId);
        if (req != null) {
            req.setStatus(FriendRequest.Status.REJECTED);
        }
    }

    private void makeFriends(long userId1, long userId2) {
        friendships.computeIfAbsent(userId1, k -> ConcurrentHashMap.newKeySet()).add(userId2);
        friendships.computeIfAbsent(userId2, k -> ConcurrentHashMap.newKeySet()).add(userId1);
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

    /** True if a PENDING request exists between the two users, in either direction. */
    public boolean hasPendingRequestBetween(long userId1, long userId2) {
        return friendRequests.values().stream()
                .anyMatch(r -> r.getStatus() == FriendRequest.Status.PENDING
                        && ((r.getFromUserId() == userId1 && r.getToUserId() == userId2)
                        || (r.getFromUserId() == userId2 && r.getToUserId() == userId1)));
    }
}

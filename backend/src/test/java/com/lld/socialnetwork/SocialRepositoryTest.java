package com.lld.socialnetwork;

import com.lld.socialnetwork.model.Comment;
import com.lld.socialnetwork.model.FriendRequest;
import com.lld.socialnetwork.model.Post;
import com.lld.socialnetwork.model.User;
import com.lld.socialnetwork.repository.SocialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SocialRepository — in-memory store")
class SocialRepositoryTest {

    private SocialRepository repo;

    @BeforeEach
    void setUp() {
        repo = new SocialRepository();
    }

    private long idOf(String namePart) {
        return repo.getAllUsers().stream()
                .filter(u -> u.getName().contains(namePart))
                .findFirst().orElseThrow().getId();
    }

    @Test
    @DisplayName("constructor seeds 3 demo users, Alice/Bob already friends, and 2 posts")
    void seedData() {
        List<User> users = repo.getAllUsers();
        assertEquals(3, users.size());
        assertTrue(users.stream().anyMatch(u -> u.getName().contains("Alice")));
        assertTrue(users.stream().anyMatch(u -> u.getName().contains("Bob")));
        assertTrue(users.stream().anyMatch(u -> u.getName().contains("Carol")));

        long alice = idOf("Alice");
        long bob = idOf("Bob");
        long carol = idOf("Carol");
        assertTrue(repo.areFriends(alice, bob));
        assertTrue(repo.areFriends(bob, alice), "friendship must be symmetric");
        assertFalse(repo.areFriends(alice, carol));

        assertEquals(2, repo.getAllPosts().size());
    }

    @Test
    @DisplayName("saveUser assigns increasing ids and an empty friend set")
    void saveUser_assignsIdAndEmptyFriendSet() {
        User u = repo.saveUser("Dave", "dave@x.com", "bio");
        assertTrue(u.getId() > 0);
        assertTrue(repo.getFriendIds(u.getId()).isEmpty());
        assertEquals(Optional.of(u).map(User::getId), repo.getUser(u.getId()).map(User::getId));
    }

    @Test
    @DisplayName("createPost + getFeed: feed contains own posts and friends' posts, sorted newest first")
    void createPost_and_getFeed() {
        long alice = idOf("Alice");
        Post p1 = repo.createPost(alice, "first");
        Post p2 = repo.createPost(alice, "second");

        List<Post> feed = repo.getFeed(alice);
        assertTrue(feed.indexOf(p2) < feed.indexOf(p1), "newest post must come first");
    }

    @Test
    @DisplayName("getFeed excludes posts from non-friends")
    void getFeed_excludesNonFriends() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");
        repo.createPost(carol, "carol's post");

        List<Post> feed = repo.getFeed(alice);
        assertTrue(feed.stream().noneMatch(p -> p.getAuthorId() == carol));
    }

    @Test
    @DisplayName("addComment / likePost return null/false for an unknown post")
    void addCommentAndLike_unknownPost() {
        assertNull(repo.addComment(999, 1, "hi"));
        assertFalse(repo.likePost(999, 1));
        assertFalse(repo.unlikePost(999, 1));
    }

    @Test
    @DisplayName("likePost/unlikePost toggle membership idempotently")
    void likeAndUnlike() {
        long alice = idOf("Alice");
        Post post = repo.createPost(alice, "like me");

        assertTrue(repo.likePost(post.getId(), alice));
        assertFalse(repo.likePost(post.getId(), alice), "liking twice is a no-op the second time");
        assertTrue(repo.unlikePost(post.getId(), alice));
        assertFalse(repo.unlikePost(post.getId(), alice));
    }

    @Test
    @DisplayName("addComment persists onto the post")
    void addComment_persistsOnPost() {
        long alice = idOf("Alice");
        Post post = repo.createPost(alice, "comment on me");
        Comment c = repo.addComment(post.getId(), alice, "nice post");

        assertEquals(1, repo.getPost(post.getId()).orElseThrow().getComments().size());
        assertEquals("nice post", c.getContent());
    }

    @Test
    @DisplayName("sendFriendRequest starts PENDING; acceptFriendRequest creates a bidirectional friendship")
    void friendRequestLifecycle_accept() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");

        FriendRequest req = repo.sendFriendRequest(carol, alice);
        assertEquals(FriendRequest.Status.PENDING, req.getStatus());
        assertFalse(repo.areFriends(alice, carol));

        repo.acceptFriendRequest(req.getId());
        FriendRequest updated = repo.getFriendRequest(req.getId()).orElseThrow();
        assertEquals(FriendRequest.Status.ACCEPTED, updated.getStatus());
        assertTrue(repo.areFriends(alice, carol));
        assertTrue(repo.areFriends(carol, alice));
    }

    @Test
    @DisplayName("rejectFriendRequest marks REJECTED and creates no friendship")
    void friendRequestLifecycle_reject() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");

        FriendRequest req = repo.sendFriendRequest(carol, alice);
        repo.rejectFriendRequest(req.getId());

        assertEquals(FriendRequest.Status.REJECTED, repo.getFriendRequest(req.getId()).orElseThrow().getStatus());
        assertFalse(repo.areFriends(alice, carol));
    }

    @Test
    @DisplayName("hasPendingRequestBetween finds a pending request in either direction")
    void hasPendingRequestBetween_bothDirections() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");

        assertFalse(repo.hasPendingRequestBetween(alice, carol));
        repo.sendFriendRequest(carol, alice);
        assertTrue(repo.hasPendingRequestBetween(alice, carol));
        assertTrue(repo.hasPendingRequestBetween(carol, alice));
    }

    @Test
    @DisplayName("getPendingRequests only returns PENDING requests addressed to that user")
    void getPendingRequests_filtersByRecipientAndStatus() {
        long alice = idOf("Alice");
        long bob = idOf("Bob");
        long carol = idOf("Carol");

        FriendRequest r1 = repo.sendFriendRequest(carol, alice);
        repo.sendFriendRequest(bob, carol); // addressed to Carol, should not show for Alice
        repo.rejectFriendRequest(r1.getId());
        FriendRequest r2 = repo.sendFriendRequest(carol, alice);

        List<FriendRequest> pendingForAlice = repo.getPendingRequests(alice);
        assertEquals(1, pendingForAlice.size());
        assertEquals(r2.getId(), pendingForAlice.get(0).getId());
    }

    @Test
    @DisplayName("getAllFriendRequests returns every request regardless of status, sorted by id")
    void getAllFriendRequests_sortedById() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");
        FriendRequest r1 = repo.sendFriendRequest(carol, alice);
        repo.rejectFriendRequest(r1.getId());
        FriendRequest r2 = repo.sendFriendRequest(carol, alice);

        List<FriendRequest> all = repo.getAllFriendRequests();
        assertTrue(all.size() >= 2);
        assertTrue(all.indexOf(all.stream().filter(r -> r.getId() == r1.getId()).findFirst().orElseThrow())
                < all.indexOf(all.stream().filter(r -> r.getId() == r2.getId()).findFirst().orElseThrow()));
    }
}

package com.lld.socialnetwork;

import com.lld.socialnetwork.exception.*;
import com.lld.socialnetwork.model.*;
import com.lld.socialnetwork.observer.FeedEvent;
import com.lld.socialnetwork.observer.FeedNotifier;
import com.lld.socialnetwork.observer.InAppFeedObserver;
import com.lld.socialnetwork.observer.LoggingFeedObserver;
import com.lld.socialnetwork.repository.SocialRepository;
import com.lld.socialnetwork.service.SocialService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SocialService — facade behaviour")
class SocialServiceTest {

    private SocialRepository repository;
    private InAppFeedObserver inAppObserver;
    private SocialService service;

    @BeforeEach
    void setUp() {
        repository = new SocialRepository(); // seeds Alice/Bob (friends)/Carol + 2 posts
        inAppObserver = new InAppFeedObserver();
        FeedNotifier notifier = new FeedNotifier(List.of(inAppObserver, new LoggingFeedObserver()));
        service = new SocialService(repository, notifier, inAppObserver);
    }

    private long idOf(String namePart) {
        return service.getAllUsers().stream()
                .filter(u -> u.getName().contains(namePart))
                .findFirst().orElseThrow().getId();
    }

    // --------------------------------------------------------------- users

    @Test
    @DisplayName("createUser rejects blank name/email")
    void createUser_rejectsBlankFields() {
        assertThrows(InvalidSocialActionException.class, () -> service.createUser("", "x@y.com", "bio"));
        assertThrows(InvalidSocialActionException.class, () -> service.createUser("Name", "", "bio"));
        assertThrows(InvalidSocialActionException.class, () -> service.createUser(null, "x@y.com", "bio"));
    }

    @Test
    @DisplayName("createUser trims and persists a valid user")
    void createUser_persists() {
        User u = service.createUser("  Dave  ", "  dave@x.com ", " bio ");
        assertEquals("Dave", u.getName());
        assertEquals("dave@x.com", u.getEmail());
        assertTrue(service.getAllUsers().stream().anyMatch(x -> x.getId() == u.getId()));
    }

    @Test
    @DisplayName("getUser throws UserNotFoundException for an unknown id")
    void getUser_unknownThrows() {
        assertThrows(UserNotFoundException.class, () -> service.getUser(999));
    }

    // --------------------------------------------------------------- posts + feed fan-out

    @Test
    @DisplayName("createPost publishes a FeedEvent that both observers receive")
    void createPost_fansOutToBothObservers() {
        long alice = idOf("Alice");
        Post post = service.createPost(alice, "Hello world");

        List<FeedEvent> events = inAppObserver.recentEvents();
        assertFalse(events.isEmpty());
        FeedEvent last = events.get(events.size() - 1);
        assertEquals(post.getId(), last.getPostId());
        assertEquals(alice, last.getAuthorId());
        assertEquals(1, last.getFriendsNotified(), "Alice has exactly one friend (Bob) in the seed data");
    }

    @Test
    @DisplayName("createPost rejects blank content and an unknown author")
    void createPost_validation() {
        long alice = idOf("Alice");
        assertThrows(InvalidSocialActionException.class, () -> service.createPost(alice, "   "));
        assertThrows(UserNotFoundException.class, () -> service.createPost(999, "hi"));
    }

    @Test
    @DisplayName("getFeed returns the user's own posts plus friends' posts, not strangers'")
    void getFeed_showsOwnAndFriendsOnly() {
        long alice = idOf("Alice");
        long bob = idOf("Bob");
        long carol = idOf("Carol");
        service.createPost(carol, "Carol's post, not visible to Alice yet");

        List<Post> feed = service.getFeed(alice);
        assertTrue(feed.stream().allMatch(p -> p.getAuthorId() == alice || p.getAuthorId() == bob));
        assertTrue(feed.stream().noneMatch(p -> p.getAuthorId() == carol));
    }

    @Test
    @DisplayName("likePost and addComment validate post/user existence")
    void engagement_validation() {
        long alice = idOf("Alice");
        Post post = service.createPost(alice, "engage with me");

        assertThrows(PostNotFoundException.class, () -> service.likePost(999, alice));
        assertThrows(UserNotFoundException.class, () -> service.likePost(post.getId(), 999));
        assertThrows(InvalidSocialActionException.class, () -> service.addComment(post.getId(), alice, " "));

        service.likePost(post.getId(), alice);
        Comment c = service.addComment(post.getId(), alice, "nice");
        assertEquals("nice", c.getContent());
    }

    // --------------------------------------------------------------- friend requests

    @Test
    @DisplayName("sendFriendRequest rejects self, unknown users, existing friendship, and a duplicate pending request")
    void sendFriendRequest_validation() {
        long alice = idOf("Alice");
        long bob = idOf("Bob");
        long carol = idOf("Carol");

        assertThrows(InvalidSocialActionException.class, () -> service.sendFriendRequest(alice, alice));
        assertThrows(UserNotFoundException.class, () -> service.sendFriendRequest(alice, 999));
        assertThrows(AlreadyFriendsException.class, () -> service.sendFriendRequest(alice, bob), "Alice/Bob are already friends in seed data");

        service.sendFriendRequest(carol, alice);
        assertThrows(DuplicateFriendRequestException.class, () -> service.sendFriendRequest(carol, alice));
        // Reversed direction must also be caught as a duplicate of the same pending pair.
        assertThrows(DuplicateFriendRequestException.class, () -> service.sendFriendRequest(alice, carol));
    }

    @Test
    @DisplayName("respondToRequest(accept) creates a bidirectional friendship")
    void respondToRequest_acceptCreatesFriendship() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");
        FriendRequest req = service.sendFriendRequest(carol, alice);

        FriendRequest updated = service.respondToRequest(req.getId(), true);
        assertEquals(FriendRequest.Status.ACCEPTED, updated.getStatus());
        assertTrue(service.getFriendIds(alice).contains(carol));
        assertTrue(service.getFriendIds(carol).contains(alice));
    }

    @Test
    @DisplayName("respondToRequest(reject) leaves no friendship")
    void respondToRequest_rejectLeavesNoFriendship() {
        long alice = idOf("Alice");
        long carol = idOf("Carol");
        FriendRequest req = service.sendFriendRequest(carol, alice);

        FriendRequest updated = service.respondToRequest(req.getId(), false);
        assertEquals(FriendRequest.Status.REJECTED, updated.getStatus());
        assertFalse(service.getFriendIds(alice).contains(carol));
    }

    @Test
    @DisplayName("respondToRequest throws for an unknown request and for a request already resolved")
    void respondToRequest_notFoundAndAlreadyResolved() {
        assertThrows(FriendRequestNotFoundException.class, () -> service.respondToRequest(999, true));

        long alice = idOf("Alice");
        long carol = idOf("Carol");
        FriendRequest req = service.sendFriendRequest(carol, alice);
        service.respondToRequest(req.getId(), true);

        assertThrows(RequestAlreadyRespondedException.class, () -> service.respondToRequest(req.getId(), true));
    }

    // --------------------------------------------------------------- sim engine

    @Test
    @DisplayName("sim sandbox is fully isolated from the live repository")
    void simSandbox_isolatedFromLive() {
        long liveUserCountBefore = service.getAllUsers().size();

        Map<String, Object> snap = service.simReset();
        assertNotNull(snap.get("users"));
        @SuppressWarnings("unchecked")
        List<User> simUsers = (List<User>) snap.get("users");
        assertEquals(3, simUsers.size(), "sim sandbox reseeds the same 3 demo users as live");

        // Mutating the sim sandbox must not affect the live repository.
        User simAlice = simUsers.stream().filter(u -> u.getName().contains("Alice")).findFirst().orElseThrow();
        service.simCreatePost(simAlice.getId(), "sim-only post", 2);

        assertEquals(liveUserCountBefore, service.getAllUsers().size());
        assertTrue(service.getAllPosts().stream().noneMatch(p -> "sim-only post".equals(p.getContent())));
    }

    @SuppressWarnings("unchecked")
    private long simIdOf(String namePart) {
        Map<String, Object> snap = service.getSimSnapshot();
        List<User> simUsers = (List<User>) snap.get("users");
        return simUsers.stream().filter(u -> u.getName().contains(namePart))
                .findFirst().orElseThrow().getId();
    }

    @Test
    @DisplayName("simRaceFriendRequests: exactly one of N concurrent attempts wins")
    void simRace_exactlyOneWins() {
        service.simReset();
        // Carol/Bob are NOT friends in the seed data (only Alice/Bob are), so the race has a
        // real winner instead of every attempt failing with AlreadyFriendsException.
        long carol = simIdOf("Carol");
        long bob = simIdOf("Bob");

        Map<String, Object> result = service.simRaceFriendRequests(carol, bob, 6, 8);
        assertEquals(1, result.get("raceSucceeded"));
        assertEquals(5, result.get("raceRejected"));
    }

    @Test
    @DisplayName("simRaceFriendRequests validates the attempts bound")
    void simRace_validatesAttempts() {
        service.simReset();
        long carol = simIdOf("Carol");
        long bob = simIdOf("Bob");
        assertThrows(InvalidSocialActionException.class, () -> service.simRaceFriendRequests(carol, bob, 1, 8));
        assertThrows(InvalidSocialActionException.class, () -> service.simRaceFriendRequests(carol, bob, 100, 8));
    }
}

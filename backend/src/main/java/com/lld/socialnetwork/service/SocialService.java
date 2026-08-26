package com.lld.socialnetwork.service;

import com.lld.socialnetwork.exception.*;
import com.lld.socialnetwork.model.*;
import com.lld.socialnetwork.observer.FeedEvent;
import com.lld.socialnetwork.observer.FeedNotifier;
import com.lld.socialnetwork.observer.InAppFeedObserver;
import com.lld.socialnetwork.observer.LoggingFeedObserver;
import com.lld.socialnetwork.repository.SocialRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade the controller delegates to wholesale. Owns the live {@link SocialRepository} plus a
 * completely separate, isolated sandbox (repository + notifier + event log) for the
 * {@code /sim/*} engine, rebuilt from scratch on every {@link #simReset()} so a demo run can
 * never leak into another and never touches live data — same shape as
 * {@code InventoryService}/{@code TrafficSignalService}.
 *
 * <p>Two things live/sim share on purpose: the pair-lock map (see below) and every mutation
 * helper (`doCreatePost`, `doSendFriendRequest`, `doRespondToRequest`) which take the target
 * repository/notifier as parameters — the same "one shared path" idiom
 * {@code InventoryService#doUpdateStock} uses, so validation and locking logic can never drift
 * between the two call sites.
 */
@Service
public class SocialService {

    /** Live module state. */
    private final SocialRepository repository;
    private final FeedNotifier feedNotifier;
    private final InAppFeedObserver inAppFeedObserver;

    /**
     * Isolated sim sandbox — a second repository plus a second notifier wired to FRESH observer
     * instances, so sandbox posts/requests never touch live data. volatile because simReset()
     * swaps the sandbox for a re-seeded one while request threads may be reading.
     */
    private volatile SocialRepository simRepository;
    private volatile FeedNotifier simFeedNotifier;
    private volatile InAppFeedObserver simInAppFeedObserver;
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    /**
     * Canonical pair lock: key is {@code min(userId1,userId2) + "#" + max(userId1,userId2)}, so
     * sendFriendRequest and respondToRequest between the same two users always contend on the
     * SAME lock object no matter which direction the request travels or which of the pair calls
     * first — mirrors {@code linkedin.service.LinkedInService#sendConnectionRequest}. Every
     * check-then-act on the friendship/pending-request state (existing friendship? existing
     * pending request? current request status?) happens after acquiring this lock and re-reads
     * state inside it, which is what stops two concurrent "send" or "accept" calls between the
     * same pair from both succeeding.
     *
     * <p>Shared between the live and sim paths — harmless extra contention across the two
     * independent id spaces (a sim userId=1 pair and a live userId=1 pair would share a lock
     * object), the same simplification {@code InventoryService#productLocks} makes for live vs
     * sim product ids.
     */
    private final ConcurrentHashMap<String, ReentrantLock> friendPairLocks = new ConcurrentHashMap<>();

    public SocialService(SocialRepository repository, FeedNotifier feedNotifier, InAppFeedObserver inAppFeedObserver) {
        this.repository = repository;
        this.feedNotifier = feedNotifier;
        this.inAppFeedObserver = inAppFeedObserver;
        resetSandbox();
    }

    // =========================================================================
    // LIVE API
    // =========================================================================

    public User createUser(String name, String email, String bio) {
        return doCreateUser(repository, name, email, bio);
    }

    public User getUser(long id) {
        return requireUser(repository, id);
    }

    public List<User> getAllUsers() {
        return repository.getAllUsers();
    }

    public Post createPost(long userId, String content) {
        return doCreatePost(repository, feedNotifier, userId, content);
    }

    public List<Post> getFeed(long userId) {
        requireUser(repository, userId);
        return repository.getFeed(userId);
    }

    public List<Post> getAllPosts() {
        return repository.getAllPosts();
    }

    public Comment addComment(long postId, long userId, String content) {
        return doAddComment(repository, postId, userId, content);
    }

    public void likePost(long postId, long userId) {
        doLikePost(repository, postId, userId);
    }

    public FriendRequest sendFriendRequest(long fromUserId, long toUserId) {
        return doSendFriendRequest(repository, fromUserId, toUserId);
    }

    public FriendRequest respondToRequest(long requestId, boolean accept) {
        return doRespondToRequest(repository, requestId, accept);
    }

    public List<FriendRequest> getPendingRequests(long userId) {
        requireUser(repository, userId);
        return repository.getPendingRequests(userId);
    }

    public List<User> getFriends(long userId) {
        requireUser(repository, userId);
        return repository.getFriends(userId);
    }

    public Set<Long> getFriendIds(long userId) {
        requireUser(repository, userId);
        return repository.getFriendIds(userId);
    }

    public List<FeedEvent> getFeedEvents() {
        return inAppFeedObserver.recentEvents();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        resetSandbox();
        simEvents.clear();
        simEventIdGen.set(1);

        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Sandbox Cold Boot")
                .description("SIM social graph re-seeded with 3 demo users (Alice, Bob, Carol); "
                        + "Alice and Bob already friends. All other users start with no friends and no posts.")
                .build()
                .addDetail("userCount", simRepository.getAllUsers().size());
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simCreateUser(String name, String email, String bio, int step) {
        try {
            User user = doCreateUser(simRepository, name, email, bio);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("USER_CREATED").status("SUCCESS")
                    .title("User Joined")
                    .description(user.getName() + " (#" + user.getId() + ") joined the network.")
                    .build());
        } catch (RuntimeException ex) {
            logSimError(step, "USER_CREATE_ERROR", ex);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simCreatePost(long userId, String content, int step) {
        try {
            Post post = doCreatePost(simRepository, simFeedNotifier, userId, content);
            int friendsNotified = simRepository.getFriendIds(userId).size();
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("POST_CREATED").status("SUCCESS")
                    .title("Post Published — Feed Fan-Out")
                    .description("Post #" + post.getId() + " published and fanned out via Observer to "
                            + friendsNotified + " friend(s)' feeds.")
                    .build()
                    .addDetail("postId", post.getId())
                    .addDetail("friendsNotified", friendsNotified));
        } catch (RuntimeException ex) {
            logSimError(step, "POST_CREATE_ERROR", ex);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simSendFriendRequest(long fromUserId, long toUserId, int step) {
        try {
            FriendRequest req = doSendFriendRequest(simRepository, fromUserId, toUserId);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("FRIEND_REQUEST_SENT").status("SUCCESS")
                    .title("Friend Request Sent")
                    .description("Request #" + req.getId() + ": " + fromUserId + " -> " + toUserId
                            + " (pair lock " + pairKey(fromUserId, toUserId) + ")")
                    .build()
                    .addDetail("requestId", req.getId())
                    .addDetail("pairKey", pairKey(fromUserId, toUserId)));
        } catch (RuntimeException ex) {
            logSimError(step, "FRIEND_REQUEST_ERROR", ex);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simRespond(long requestId, boolean accept, int step) {
        try {
            FriendRequest req = doRespondToRequest(simRepository, requestId, accept);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType(accept ? "FRIEND_REQUEST_ACCEPTED" : "FRIEND_REQUEST_REJECTED")
                    .status("SUCCESS")
                    .title(accept ? "Friend Request Accepted" : "Friend Request Rejected")
                    .description("Request #" + req.getId() + " between " + req.getFromUserId() + " and "
                            + req.getToUserId() + " -> " + req.getStatus()
                            + (accept ? " (bidirectional friendship formed)" : ""))
                    .build());
        } catch (RuntimeException ex) {
            logSimError(step, "FRIEND_RESPOND_ERROR", ex);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simLikePost(long postId, long userId, int step) {
        try {
            doLikePost(simRepository, postId, userId);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("POST_LIKED").status("SUCCESS")
                    .title("Post Liked")
                    .description("User #" + userId + " liked post #" + postId + ".")
                    .build());
        } catch (RuntimeException ex) {
            logSimError(step, "LIKE_ERROR", ex);
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simAddComment(long postId, long userId, String content, int step) {
        try {
            Comment comment = doAddComment(simRepository, postId, userId, content);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("COMMENT_ADDED").status("SUCCESS")
                    .title("Comment Added")
                    .description("User #" + userId + " commented on post #" + postId + ": \"" + content + "\"")
                    .build()
                    .addDetail("commentId", comment.getId()));
        } catch (RuntimeException ex) {
            logSimError(step, "COMMENT_ERROR", ex);
            throw ex;
        }
        return getSimSnapshot();
    }

    /**
     * Fires {@code attempts} concurrent {@code sendFriendRequest} calls at the SAME pair via a
     * {@link CountDownLatch} so they genuinely race, proving the canonical pair lock live in the
     * UI: exactly one attempt creates the PENDING request, every other racer is rejected with
     * {@link DuplicateFriendRequestException} — never a duplicate request, never a deadlock.
     * Mirrors {@code InventoryService#simRace}.
     */
    public Map<String, Object> simRaceFriendRequests(long userId1, long userId2, int attempts, int step) {
        if (attempts < 2 || attempts > 20) {
            throw new InvalidSocialActionException("attempts must be between 2 and 20");
        }
        requireUser(simRepository, userId1);
        requireUser(simRepository, userId2);

        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        Thread[] threads = new Thread[attempts];
        for (int i = 0; i < attempts; i++) {
            boolean fromFirst = i % 2 == 0; // alternate direction to also prove order-independence
            threads[i] = new Thread(() -> {
                try {
                    start.await();
                    if (fromFirst) {
                        doSendFriendRequest(simRepository, userId1, userId2);
                    } else {
                        doSendFriendRequest(simRepository, userId2, userId1);
                    }
                    succeeded.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (DuplicateFriendRequestException | AlreadyFriendsException e) {
                    rejected.incrementAndGet();
                }
            }, "socialnetwork-sim-racer-" + i);
            threads[i].start();
        }
        start.countDown();
        for (Thread t : threads) {
            try {
                t.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        synchronized (this) {
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("PAIR_LOCK_RACE").status("SUCCESS")
                    .title("Concurrent Friend Request Race")
                    .description(attempts + " threads raced to send a friend request between #" + userId1
                            + " and #" + userId2 + " simultaneously: " + succeeded.get() + " succeeded, "
                            + rejected.get() + " rejected — the canonical pair lock let exactly one through.")
                    .build()
                    .addDetail("attempts", attempts)
                    .addDetail("succeeded", succeeded.get())
                    .addDetail("rejected", rejected.get())
                    .addDetail("pairKey", pairKey(userId1, userId2)));
        }

        Map<String, Object> result = new LinkedHashMap<>(getSimSnapshot());
        result.put("raceAttempts", attempts);
        result.put("raceSucceeded", succeeded.get());
        result.put("raceRejected", rejected.get());
        return result;
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public synchronized Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("users", simRepository.getAllUsers());
        snapshot.put("posts", simRepository.getAllPosts());
        snapshot.put("friendRequests", simRepository.getAllFriendRequests());
        snapshot.put("feedEvents", simInAppFeedObserver.recentEvents());
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    // =========================================================================
    // SHARED INTERNALS — used by both the live API and the sim engine
    // =========================================================================

    private User doCreateUser(SocialRepository repo, String name, String email, String bio) {
        if (name == null || name.isBlank()) {
            throw new InvalidSocialActionException("Name is required");
        }
        if (email == null || email.isBlank()) {
            throw new InvalidSocialActionException("Email is required");
        }
        return repo.saveUser(name.trim(), email.trim(), bio == null ? "" : bio.trim());
    }

    /**
     * The ONE post-creation path for live and sim alike: validates, persists, then fans a
     * {@link FeedEvent} out through the Observer chain to whichever notifier the caller passed
     * in — {@code InAppFeedObserver} records it for the telemetry HUD/feed-events endpoint,
     * {@code LoggingFeedObserver} writes it to the server log, neither aware the other exists.
     */
    private Post doCreatePost(SocialRepository repo, FeedNotifier notifier, long userId, String content) {
        User author = requireUser(repo, userId);
        if (content == null || content.isBlank()) {
            throw new InvalidSocialActionException("Content cannot be empty");
        }
        Post post = repo.createPost(userId, content.trim());
        int friendsNotified = repo.getFriendIds(userId).size();
        FeedEvent event = FeedEvent.builder()
                .postId(post.getId())
                .authorId(userId)
                .authorName(author.getName())
                .contentPreview(preview(post.getContent()))
                .friendsNotified(friendsNotified)
                .timestamp(LocalDateTime.now())
                .build();
        notifier.publish(event); // fans out to every registered observer, including the in-app feed
        return post;
    }

    private Comment doAddComment(SocialRepository repo, long postId, long userId, String content) {
        requireUser(repo, userId);
        requirePost(repo, postId);
        if (content == null || content.isBlank()) {
            throw new InvalidSocialActionException("Comment cannot be empty");
        }
        return repo.addComment(postId, userId, content.trim());
    }

    private void doLikePost(SocialRepository repo, long postId, long userId) {
        requireUser(repo, userId);
        requirePost(repo, postId);
        repo.likePost(postId, userId);
    }

    /**
     * Send-request path, guarded by the canonical pair lock. Every read that decides whether
     * the request is allowed (already friends? already a pending request between this pair?)
     * happens INSIDE the lock, so two concurrent sends between the same pair can never both
     * create a PENDING request.
     */
    private FriendRequest doSendFriendRequest(SocialRepository repo, long fromUserId, long toUserId) {
        if (fromUserId == toUserId) {
            throw new InvalidSocialActionException("Cannot send a friend request to yourself");
        }
        requireUser(repo, fromUserId);
        requireUser(repo, toUserId);

        ReentrantLock lock = lockFor(fromUserId, toUserId);
        lock.lock();
        try {
            if (repo.areFriends(fromUserId, toUserId)) {
                throw new AlreadyFriendsException(fromUserId, toUserId);
            }
            if (repo.hasPendingRequestBetween(fromUserId, toUserId)) {
                throw new DuplicateFriendRequestException(fromUserId, toUserId);
            }
            return repo.sendFriendRequest(fromUserId, toUserId);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Accept/reject path, guarded by the SAME pair lock {@code doSendFriendRequest} uses for
     * this pair. Re-reads the request's status inside the lock rather than trusting the copy
     * read before acquiring it, so a concurrent accept-then-accept (or accept-then-duplicate-
     * send) race can never double-process one request or lose an accept.
     */
    private FriendRequest doRespondToRequest(SocialRepository repo, long requestId, boolean accept) {
        FriendRequest initial = repo.getFriendRequest(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException(requestId));

        ReentrantLock lock = lockFor(initial.getFromUserId(), initial.getToUserId());
        lock.lock();
        try {
            FriendRequest current = repo.getFriendRequest(requestId)
                    .orElseThrow(() -> new FriendRequestNotFoundException(requestId));
            if (current.getStatus() != FriendRequest.Status.PENDING) {
                throw new RequestAlreadyRespondedException(requestId, current.getStatus());
            }
            if (accept) {
                repo.acceptFriendRequest(requestId);
            } else {
                repo.rejectFriendRequest(requestId);
            }
            return repo.getFriendRequest(requestId).orElseThrow();
        } finally {
            lock.unlock();
        }
    }

    private User requireUser(SocialRepository repo, long userId) {
        return repo.getUser(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }

    private Post requirePost(SocialRepository repo, long postId) {
        return repo.getPost(postId).orElseThrow(() -> new PostNotFoundException(postId));
    }

    private ReentrantLock lockFor(long userId1, long userId2) {
        return friendPairLocks.computeIfAbsent(pairKey(userId1, userId2), k -> new ReentrantLock(true));
    }

    private String pairKey(long userId1, long userId2) {
        return Math.min(userId1, userId2) + "#" + Math.max(userId1, userId2);
    }

    private String preview(String content) {
        return content.length() > 60 ? content.substring(0, 57) + "..." : content;
    }

    private void logSimError(int step, String eventType, RuntimeException ex) {
        simEvents.add(SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType(eventType).status("ERROR")
                .title("Rejected")
                .description(ex.getMessage())
                .build());
    }

    private void resetSandbox() {
        SocialRepository freshRepo = new SocialRepository(); // constructor seeds demo data
        InAppFeedObserver freshFeed = new InAppFeedObserver();
        FeedNotifier freshNotifier = new FeedNotifier(List.of(freshFeed, new LoggingFeedObserver()));
        this.simRepository = freshRepo;
        this.simInAppFeedObserver = freshFeed;
        this.simFeedNotifier = freshNotifier;
    }
}

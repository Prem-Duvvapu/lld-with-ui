package com.lld.musicstreaming.service;

import com.lld.musicstreaming.exception.ConcurrentStreamLimitExceededException;
import com.lld.musicstreaming.exception.SessionAlreadyEndedException;
import com.lld.musicstreaming.exception.SessionNotFoundException;
import com.lld.musicstreaming.exception.SkipLimitExceededException;
import com.lld.musicstreaming.exception.SongNotFoundException;
import com.lld.musicstreaming.exception.UserNotFoundException;
import com.lld.musicstreaming.model.PlaybackSession;
import com.lld.musicstreaming.model.Song;
import com.lld.musicstreaming.model.User;
import com.lld.musicstreaming.observer.PlaybackEventListener;
import com.lld.musicstreaming.repository.MusicStreamingRepository;
import com.lld.musicstreaming.strategy.SubscriptionStrategy;
import com.lld.musicstreaming.strategy.SubscriptionStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Owns the one genuinely compound, thread-unsafe operation in this module: starting a
 * playback session while enforcing "no more than N concurrent streams per account."
 *
 * <p>"Count my active sessions, then create a new one if I'm under the limit" is a
 * classic check-then-act race. Two devices on the same FREE account (limit 1) calling
 * {@link #startStream} at the same instant can both read {@code activeCount == 0} before
 * either has written its session, and both would be allowed through without a lock —
 * the account streams on two devices despite the plan enforcing one.
 *
 * <p>A {@link ReentrantLock} per user (not a single global lock) makes the check-and-increment
 * atomic per account while letting unrelated users start streams fully in parallel — the
 * same per-key locking shape as {@code RestaurantTableAllocationService.occupy}.
 */
@Service
public class PlaybackService {

    private final ConcurrentMap<String, ReentrantLock> userLocks = new ConcurrentHashMap<>();
    private final List<PlaybackEventListener> listeners;

    public PlaybackService(List<PlaybackEventListener> listeners) {
        this.listeners = listeners;
    }

    private ReentrantLock lockFor(String userId) {
        return userLocks.computeIfAbsent(userId, k -> new ReentrantLock());
    }

    public PlaybackSession startStream(MusicStreamingRepository repo, SubscriptionStrategyFactory factory,
                                        String userId, String songId, String deviceId) {
        ReentrantLock lock = lockFor(userId);
        lock.lock();
        try {
            User user = repo.findUserById(userId)
                    .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
            Song song = repo.findSongById(songId)
                    .orElseThrow(() -> new SongNotFoundException("Song not found: " + songId));

            SubscriptionStrategy strategy = factory.getStrategy(user.getSubscription().getPlan());

            // The critical section: read-then-write on the same account must not interleave
            // with another thread's read-then-write, or both can slip past the cap.
            long activeCount = repo.countActiveSessionsForUser(userId);
            if (activeCount >= strategy.maxConcurrentStreams()) {
                throw new ConcurrentStreamLimitExceededException(
                        "User " + userId + " (" + strategy.getPlan() + ") already has " + activeCount
                                + " active stream(s); plan allows " + strategy.maxConcurrentStreams());
            }

            PlaybackSession session = PlaybackSession.builder()
                    .id(repo.generateSessionId())
                    .userId(userId)
                    .songId(songId)
                    .deviceId(deviceId != null ? deviceId : "device-1")
                    .active(true)
                    .startedAt(Instant.now())
                    .adInjected(!strategy.isAdFree())
                    .build();
            repo.saveSession(session);

            // Observer: PlaybackService has no idea what these listeners do (history,
            // trending play counts, tomorrow maybe analytics) — it only announces the event.
            for (PlaybackEventListener listener : listeners) {
                listener.onStreamStarted(repo, user, song);
            }

            return session;
        } finally {
            lock.unlock();
        }
    }

    public PlaybackSession stopStream(MusicStreamingRepository repo, String sessionId) {
        PlaybackSession session = repo.findSessionById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("Session not found: " + sessionId));

        ReentrantLock lock = lockFor(session.getUserId());
        lock.lock();
        try {
            if (!session.isActive()) {
                throw new SessionAlreadyEndedException("Session " + sessionId + " has already ended");
            }
            session.setActive(false);
            session.setEndedAt(Instant.now());
            return repo.saveSession(session);
        } finally {
            lock.unlock();
        }
    }

    public PlaybackSession skip(MusicStreamingRepository repo, SubscriptionStrategyFactory factory, String sessionId) {
        PlaybackSession session = repo.findSessionById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("Session not found: " + sessionId));

        ReentrantLock lock = lockFor(session.getUserId());
        lock.lock();
        try {
            User user = repo.findUserById(session.getUserId())
                    .orElseThrow(() -> new UserNotFoundException("User not found: " + session.getUserId()));
            SubscriptionStrategy strategy = factory.getStrategy(user.getSubscription().getPlan());

            if (!strategy.canSkip(user.getSkipsUsedThisHour())) {
                throw new SkipLimitExceededException(
                        "User " + user.getId() + " (" + strategy.getPlan() + ") has used all "
                                + strategy.skipLimitPerHour() + " skips this hour");
            }

            user.setSkipsUsedThisHour(user.getSkipsUsedThisHour() + 1);
            repo.saveUser(user);
            return session;
        } finally {
            lock.unlock();
        }
    }
}

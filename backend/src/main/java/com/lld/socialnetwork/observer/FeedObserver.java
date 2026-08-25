package com.lld.socialnetwork.observer;

/**
 * One observer of the "a friend posted" event. Implementations are notified by
 * {@link FeedNotifier} whenever {@code SocialService#createPost} fans a new post out to the
 * author's friends' feeds.
 *
 * <p>Observers must never throw into the publisher and must never mutate social-graph state —
 * they are read-only views of the event stream, same contract as inventory's
 * {@code StockAlertObserver}.
 */
public interface FeedObserver {
    void onFeedEvent(FeedEvent event);
}

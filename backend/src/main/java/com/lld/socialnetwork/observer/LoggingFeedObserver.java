package com.lld.socialnetwork.observer;

import org.springframework.stereotype.Component;

/**
 * Writes every feed-fanout event to the server log — demonstrates that two observers with
 * completely different sinks receive the same event without knowing each other, same shape as
 * {@code LoggingStockAlertObserver}.
 */
@Component
public class LoggingFeedObserver implements FeedObserver {

    @Override
    public void onFeedEvent(FeedEvent event) {
        System.out.printf("[socialnetwork-feed] post #%d by %s fanned out to %d friend feed(s): \"%s\"%n",
                event.getPostId(), event.getAuthorName(), event.getFriendsNotified(), event.getContentPreview());
    }
}

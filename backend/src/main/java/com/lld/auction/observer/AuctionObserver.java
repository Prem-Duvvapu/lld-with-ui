package com.lld.auction.observer;

/**
 * One observer of the outbid event stream. Implementations are notified by
 * {@link AuctionNotifier} whenever a bid supersedes the previous leading bid on an auction.
 *
 * <p>Observers must never throw into the publisher and must never mutate auction state — they
 * are read-only views of the event stream, the same contract as inventory's
 * {@code StockAlertObserver}.
 */
public interface AuctionObserver {
    void onOutbid(OutbidEvent event);
}

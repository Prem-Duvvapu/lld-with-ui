package com.lld.musicstreaming.strategy;

import com.lld.musicstreaming.model.AudioQuality;
import com.lld.musicstreaming.model.SubscriptionPlan;

/**
 * What a subscription tier permits. Every feature check that used to be
 * {@code if (plan == PREMIUM || plan == FAMILY)} scattered through the service lives
 * behind this interface instead — {@link SubscriptionStrategyFactory} resolves the plan
 * to one implementation and {@code PlaybackService}/{@code MusicStreamingService} call
 * only these methods, never the enum directly.
 */
public interface SubscriptionStrategy {

    SubscriptionPlan getPlan();

    /** Maximum number of devices that may stream simultaneously on this account. */
    int maxConcurrentStreams();

    /** -1 means unlimited; otherwise the number of manual skips allowed per rolling hour. */
    int skipLimitPerHour();

    default boolean canSkip(int skipsUsedThisHour) {
        int limit = skipLimitPerHour();
        return limit < 0 || skipsUsedThisHour < limit;
    }

    boolean isAdFree();

    boolean canDownloadOffline();

    AudioQuality audioQuality();
}

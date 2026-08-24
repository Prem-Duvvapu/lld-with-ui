package com.lld.musicstreaming.strategy;

import com.lld.musicstreaming.model.AudioQuality;
import com.lld.musicstreaming.model.SubscriptionPlan;

/** Ad-supported tier: one stream at a time, capped skips, no offline downloads, compressed audio. */
public class FreeSubscriptionStrategy implements SubscriptionStrategy {

    @Override
    public SubscriptionPlan getPlan() {
        return SubscriptionPlan.FREE;
    }

    @Override
    public int maxConcurrentStreams() {
        return 1;
    }

    @Override
    public int skipLimitPerHour() {
        return 6;
    }

    @Override
    public boolean isAdFree() {
        return false;
    }

    @Override
    public boolean canDownloadOffline() {
        return false;
    }

    @Override
    public AudioQuality audioQuality() {
        return AudioQuality.STANDARD_128KBPS;
    }
}

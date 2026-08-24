package com.lld.musicstreaming.strategy;

import com.lld.musicstreaming.model.AudioQuality;
import com.lld.musicstreaming.model.SubscriptionPlan;

/** Paid single-user tier: ad-free, unlimited skips, offline downloads, lossless audio, 2 devices. */
public class PremiumSubscriptionStrategy implements SubscriptionStrategy {

    @Override
    public SubscriptionPlan getPlan() {
        return SubscriptionPlan.PREMIUM;
    }

    @Override
    public int maxConcurrentStreams() {
        return 2;
    }

    @Override
    public int skipLimitPerHour() {
        return -1;
    }

    @Override
    public boolean isAdFree() {
        return true;
    }

    @Override
    public boolean canDownloadOffline() {
        return true;
    }

    @Override
    public AudioQuality audioQuality() {
        return AudioQuality.LOSSLESS_FLAC;
    }
}

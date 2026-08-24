package com.lld.musicstreaming.strategy;

import com.lld.musicstreaming.model.AudioQuality;
import com.lld.musicstreaming.model.SubscriptionPlan;

/** Shared multi-user tier: everything Premium has, plus up to 6 concurrent household streams. */
public class FamilySubscriptionStrategy implements SubscriptionStrategy {

    @Override
    public SubscriptionPlan getPlan() {
        return SubscriptionPlan.FAMILY;
    }

    @Override
    public int maxConcurrentStreams() {
        return 6;
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
        return AudioQuality.HIGH_320KBPS;
    }
}

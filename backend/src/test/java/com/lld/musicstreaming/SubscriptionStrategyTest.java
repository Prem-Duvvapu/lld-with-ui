package com.lld.musicstreaming;

import com.lld.musicstreaming.model.AudioQuality;
import com.lld.musicstreaming.model.SubscriptionPlan;
import com.lld.musicstreaming.strategy.FamilySubscriptionStrategy;
import com.lld.musicstreaming.strategy.FreeSubscriptionStrategy;
import com.lld.musicstreaming.strategy.PremiumSubscriptionStrategy;
import com.lld.musicstreaming.strategy.SubscriptionStrategy;
import com.lld.musicstreaming.strategy.SubscriptionStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the exact permissions each subscription tier grants — the thing the Strategy +
 * Factory pattern exists to encapsulate. If a tier's numbers drift, this is where it
 * shows up rather than in a passing integration test that never checked the boundary.
 */
@DisplayName("Music Streaming Subscription Strategy Unit Tests")
class SubscriptionStrategyTest {

    private SubscriptionStrategyFactory factory;

    @BeforeEach
    void setUp() {
        factory = new SubscriptionStrategyFactory();
    }

    @Test
    @DisplayName("Factory resolves each plan to its concrete strategy")
    void factoryResolvesEachPlan() {
        assertInstanceOf(FreeSubscriptionStrategy.class, factory.getStrategy(SubscriptionPlan.FREE));
        assertInstanceOf(PremiumSubscriptionStrategy.class, factory.getStrategy(SubscriptionPlan.PREMIUM));
        assertInstanceOf(FamilySubscriptionStrategy.class, factory.getStrategy(SubscriptionPlan.FAMILY));
    }

    @Test
    @DisplayName("Factory rejects a null plan rather than returning something wrong silently")
    void factoryRejectsNullPlan() {
        assertThrows(IllegalArgumentException.class, () -> factory.getStrategy(null));
    }

    @Test
    @DisplayName("FREE: one stream, ad-supported, 6 skips/hour, no downloads, standard quality")
    void freePlanPermissions() {
        SubscriptionStrategy free = factory.getStrategy(SubscriptionPlan.FREE);

        assertEquals(SubscriptionPlan.FREE, free.getPlan());
        assertEquals(1, free.maxConcurrentStreams());
        assertEquals(6, free.skipLimitPerHour());
        assertFalse(free.isAdFree());
        assertFalse(free.canDownloadOffline());
        assertEquals(AudioQuality.STANDARD_128KBPS, free.audioQuality());

        assertTrue(free.canSkip(0));
        assertTrue(free.canSkip(5));
        assertFalse(free.canSkip(6), "the 7th skip in an hour must be refused");
        assertFalse(free.canSkip(100));
    }

    @Test
    @DisplayName("PREMIUM: two streams, ad-free, unlimited skips, downloads, lossless quality")
    void premiumPlanPermissions() {
        SubscriptionStrategy premium = factory.getStrategy(SubscriptionPlan.PREMIUM);

        assertEquals(SubscriptionPlan.PREMIUM, premium.getPlan());
        assertEquals(2, premium.maxConcurrentStreams());
        assertEquals(-1, premium.skipLimitPerHour());
        assertTrue(premium.isAdFree());
        assertTrue(premium.canDownloadOffline());
        assertEquals(AudioQuality.LOSSLESS_FLAC, premium.audioQuality());

        assertTrue(premium.canSkip(0));
        assertTrue(premium.canSkip(10_000), "unlimited means unlimited");
    }

    @Test
    @DisplayName("FAMILY: six streams, ad-free, unlimited skips, downloads, high quality")
    void familyPlanPermissions() {
        SubscriptionStrategy family = factory.getStrategy(SubscriptionPlan.FAMILY);

        assertEquals(SubscriptionPlan.FAMILY, family.getPlan());
        assertEquals(6, family.maxConcurrentStreams());
        assertEquals(-1, family.skipLimitPerHour());
        assertTrue(family.isAdFree());
        assertTrue(family.canDownloadOffline());
        assertEquals(AudioQuality.HIGH_320KBPS, family.audioQuality());
    }

    @Test
    @DisplayName("Every tier's device cap is strictly ordered FREE < PREMIUM < FAMILY")
    void deviceCapsAreOrdered() {
        int freeCap = factory.getStrategy(SubscriptionPlan.FREE).maxConcurrentStreams();
        int premiumCap = factory.getStrategy(SubscriptionPlan.PREMIUM).maxConcurrentStreams();
        int familyCap = factory.getStrategy(SubscriptionPlan.FAMILY).maxConcurrentStreams();

        assertTrue(freeCap < premiumCap, "premium must allow more devices than free");
        assertTrue(premiumCap < familyCap, "family must allow more devices than premium");
    }
}

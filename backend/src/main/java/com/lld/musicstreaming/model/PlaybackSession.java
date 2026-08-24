package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * One "device is streaming a song" session for a user. {@link PlaybackService} enforces
 * that the count of {@code active == true} sessions per user never exceeds the limit the
 * user's {@link com.lld.musicstreaming.strategy.SubscriptionStrategy} allows.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaybackSession {
    private String id;
    private String userId;
    private String songId;
    private String deviceId;
    @Builder.Default
    private boolean active = true;
    @Builder.Default
    private Instant startedAt = Instant.now();
    private Instant endedAt;
    @Builder.Default
    private boolean adInjected = false;
}

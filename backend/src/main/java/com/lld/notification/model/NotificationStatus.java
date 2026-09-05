package com.lld.notification.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Notification lifecycle, with the legal transitions declared rather than implied — the same
 * idiom as {@code uber.model.RideStatus}: a {@code Map<NotificationStatus, Set<NotificationStatus>>}
 * declared once and enforced through one gate ({@code NotificationService#transition}), instead
 * of each call site re-deriving its own notion of which moves are legal.
 *
 * <pre>
 *   PENDING   -&gt; SENT | RETRYING | SUPPRESSED | FAILED
 *   RETRYING  -&gt; SENT | FAILED
 *   SENT / SUPPRESSED / FAILED are terminal
 * </pre>
 */
public enum NotificationStatus {
    PENDING,
    SENT,
    RETRYING,
    SUPPRESSED,
    FAILED;

    private static final Map<NotificationStatus, Set<NotificationStatus>> ALLOWED = Map.of(
            PENDING, EnumSet.of(SENT, RETRYING, SUPPRESSED, FAILED),
            RETRYING, EnumSet.of(SENT, FAILED),
            SENT, EnumSet.noneOf(NotificationStatus.class),
            SUPPRESSED, EnumSet.noneOf(NotificationStatus.class),
            FAILED, EnumSet.noneOf(NotificationStatus.class)
    );

    /** True when this notification can never move again. */
    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(NotificationStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<NotificationStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}

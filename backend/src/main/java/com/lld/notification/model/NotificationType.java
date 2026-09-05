package com.lld.notification.model;

/**
 * The kind of notification being sent. Each type carries an inherent default {@link Priority},
 * overridable per-request (a caller can, for example, downgrade a PROMOTIONAL blast or upgrade a
 * TRANSACTIONAL receipt) — see {@code NotificationService#send}.
 */
public enum NotificationType {
    OTP(Priority.HIGH),
    TRANSACTIONAL(Priority.MEDIUM),
    PROMOTIONAL(Priority.LOW),
    ALERT(Priority.HIGH);

    private final Priority defaultPriority;

    NotificationType(Priority defaultPriority) {
        this.defaultPriority = defaultPriority;
    }

    public Priority defaultPriority() {
        return defaultPriority;
    }
}

package com.lld.notification.model;

/**
 * Dispatch priority. Deliberately a plain enum with no custom {@code compareTo} — every Java
 * enum already implements {@link Comparable} by declaration (ordinal) order, so
 * {@code HIGH.compareTo(LOW) < 0} for free, which is exactly the ordering
 * {@link com.lld.notification.service.NotificationService}'s {@code PriorityBlockingQueue}
 * needs: HIGH-priority notifications (e.g. OTP) must always sort ahead of LOW-priority ones
 * (e.g. PROMOTIONAL), regardless of enqueue order.
 */
public enum Priority {
    HIGH,
    MEDIUM,
    LOW
}

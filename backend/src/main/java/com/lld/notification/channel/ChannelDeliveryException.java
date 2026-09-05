package com.lld.notification.channel;

/**
 * Signals that a single delivery attempt on a channel failed. This is a checked, internal
 * signal consumed entirely by {@code NotificationService}'s retry loop — it never crosses the
 * controller boundary (a failed attempt becomes a {@code RETRYING} or {@code FAILED} status on
 * the {@code Notification}, not an HTTP error), so unlike the {@code exception} package it does
 * not extend {@code DomainException}.
 */
public class ChannelDeliveryException extends Exception {
    public ChannelDeliveryException(String message) {
        super(message);
    }
}

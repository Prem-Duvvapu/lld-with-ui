package com.lld.notification.model;

/** The delivery channel a notification is routed through. Resolved to a concrete
 * {@link com.lld.notification.channel.NotificationChannel} by
 * {@link com.lld.notification.channel.NotificationChannelFactory}. */
public enum ChannelType {
    EMAIL,
    SMS,
    PUSH,
    WHATSAPP
}

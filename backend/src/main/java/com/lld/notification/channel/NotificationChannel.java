package com.lld.notification.channel;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;

/** Strategy interface for delivering a notification over one concrete channel.
 * Implementations: {@link EmailChannel}, {@link SmsChannel}, {@link PushChannel},
 * {@link WhatsAppChannel} — resolved by {@link NotificationChannelFactory}. */
public interface NotificationChannel {
    void send(Notification notification) throws ChannelDeliveryException;

    ChannelType getType();
}

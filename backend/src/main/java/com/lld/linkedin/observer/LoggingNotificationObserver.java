package com.lld.linkedin.observer;

import com.lld.linkedin.model.Notification;
import org.springframework.stereotype.Component;

@Component
public class LoggingNotificationObserver implements NotificationObserver {
    @Override
    public void onNotification(Notification notification) {
        if (notification != null) {
            System.out.println(String.format("[NOTIF] To: %s | From: %s | Type: %s | Message: %s",
                    notification.getRecipientId(),
                    notification.getActorId(),
                    notification.getType(),
                    notification.getMessage()));
        }
    }
}

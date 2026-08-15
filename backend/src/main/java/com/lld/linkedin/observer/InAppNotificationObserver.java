package com.lld.linkedin.observer;

import com.lld.linkedin.model.Notification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class InAppNotificationObserver implements NotificationObserver {
    private final Map<String, List<Notification>> userInboxes = new ConcurrentHashMap<>();

    @Override
    public void onNotification(Notification notification) {
        if (notification != null && notification.getRecipientId() != null) {
            userInboxes.computeIfAbsent(notification.getRecipientId(), k -> new CopyOnWriteArrayList<>())
                    .add(notification);
        }
    }

    public List<Notification> getNotificationsForUser(String userId) {
        return userInboxes.getOrDefault(userId, List.of());
    }

    public void clear() {
        userInboxes.clear();
    }
}

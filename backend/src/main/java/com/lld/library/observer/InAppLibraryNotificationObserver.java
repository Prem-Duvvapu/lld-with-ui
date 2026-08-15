package com.lld.library.observer;

import com.lld.library.enums.NotificationType;
import com.lld.library.model.Notification;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class InAppLibraryNotificationObserver implements LibraryNotificationObserver {

    private final Map<String, List<Notification>> memberNotifications = new ConcurrentHashMap<>();

    @Override
    public void onNotification(String memberId, NotificationType type, String message, String referenceId) {
        if (memberId != null) {
            Notification n = new Notification(memberId, type, message, referenceId);
            memberNotifications.computeIfAbsent(memberId, k -> new CopyOnWriteArrayList<>()).add(n);
        }
    }

    public List<Notification> getNotificationsForMember(String memberId) {
        return memberNotifications.getOrDefault(memberId, Collections.emptyList());
    }

    public void clear() {
        memberNotifications.clear();
    }
}

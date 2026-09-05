package com.lld.notification.repository;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationType;
import com.lld.notification.model.UserPreference;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/** In-memory storage: notifications, the recipient directory, and per-user channel/type
 * preferences. Every store is a {@link ConcurrentHashMap} — genuinely thread-safe, not a
 * {@code HashMap} that happens to work single-threaded. */
@Repository
public class NotificationRepository {
    private final Map<Long, Notification> notifications = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    private final Map<String, UserPreference> preferences = new ConcurrentHashMap<>();
    private final Map<Long, String> recipientDirectory = new ConcurrentHashMap<>();

    public void clear() {
        notifications.clear();
        idCounter.set(1);
        preferences.clear();
        recipientDirectory.clear();
    }

    // --- recipients ---

    public void registerRecipient(long recipientId, String name) {
        recipientDirectory.put(recipientId, name);
    }

    public boolean isKnownRecipient(long recipientId) {
        return recipientDirectory.containsKey(recipientId);
    }

    public String getRecipientName(long recipientId) {
        return recipientDirectory.getOrDefault(recipientId, "Recipient " + recipientId);
    }

    public Map<Long, String> getRecipientDirectory() {
        return new LinkedHashMap<>(recipientDirectory);
    }

    // --- notifications ---

    public Notification save(Notification notification) {
        if (notification.getId() == null) {
            notification.setId(idCounter.getAndIncrement());
        }
        notifications.put(notification.getId(), notification);
        return notification;
    }

    public Notification findById(long id) {
        return notifications.get(id);
    }

    public List<Notification> findAll() {
        return new ArrayList<>(notifications.values());
    }

    public List<Notification> findByRecipient(long recipientId) {
        List<Notification> result = new ArrayList<>();
        for (Notification n : notifications.values()) {
            if (n.getRecipientId() == recipientId) {
                result.add(n);
            }
        }
        return result;
    }

    // --- preferences ---

    private static String preferenceKey(long userId, NotificationType type, ChannelType channel) {
        return userId + ":" + type + ":" + channel;
    }

    public void setPreference(long userId, NotificationType type, ChannelType channel, boolean optedIn) {
        UserPreference pref = UserPreference.builder()
                .userId(userId).type(type).channel(channel).optedIn(optedIn).build();
        preferences.put(preferenceKey(userId, type, channel), pref);
    }

    /** Default is opted-in when no explicit preference has been recorded for this pair. */
    public boolean isOptedIn(long userId, NotificationType type, ChannelType channel) {
        UserPreference pref = preferences.get(preferenceKey(userId, type, channel));
        return pref == null || pref.isOptedIn();
    }

    public List<UserPreference> getPreferences(long userId) {
        List<UserPreference> result = new ArrayList<>();
        for (UserPreference pref : preferences.values()) {
            if (pref.getUserId() == userId) {
                result.add(pref);
            }
        }
        return result;
    }
}

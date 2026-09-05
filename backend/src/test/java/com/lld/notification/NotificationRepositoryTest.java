package com.lld.notification;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationStatus;
import com.lld.notification.model.NotificationType;
import com.lld.notification.model.Priority;
import com.lld.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Notification Repository")
class NotificationRepositoryTest {

    private NotificationRepository repository;

    @BeforeEach
    void setUp() {
        repository = new NotificationRepository();
    }

    private Notification newNotification(long recipientId) {
        return Notification.builder()
                .recipientId(recipientId).type(NotificationType.OTP).priority(Priority.HIGH)
                .channel(ChannelType.SMS).templateData(Map.of("otp", "1234"))
                .status(NotificationStatus.PENDING).attemptCount(0).idempotencyKey("K-" + recipientId)
                .build();
    }

    @Test
    @DisplayName("save() assigns a unique, increasing id and findById() retrieves it")
    void saveAssignsIdAndFindByIdRetrieves() {
        Notification a = repository.save(newNotification(1L));
        Notification b = repository.save(newNotification(1L));

        assertNotNull(a.getId());
        assertNotNull(b.getId());
        assertNotEquals(a.getId(), b.getId());
        assertEquals(a, repository.findById(a.getId()));
        assertEquals(b, repository.findById(b.getId()));
    }

    @Test
    @DisplayName("findById() on an absent key returns null, not an exception")
    void findByIdAbsentReturnsNull() {
        assertNull(repository.findById(999L));
    }

    @Test
    @DisplayName("findByRecipient() filters correctly; findAll() returns everything")
    void findByRecipientFilters() {
        repository.save(newNotification(1L));
        repository.save(newNotification(1L));
        repository.save(newNotification(2L));

        assertEquals(2, repository.findByRecipient(1L).size());
        assertEquals(1, repository.findByRecipient(2L).size());
        assertEquals(0, repository.findByRecipient(3L).size());
        assertEquals(3, repository.findAll().size());
    }

    @Test
    @DisplayName("clear() resets notifications, recipients and preferences")
    void clearResetsEverything() {
        repository.registerRecipient(1L, "Alice");
        repository.save(newNotification(1L));
        repository.setPreference(1L, NotificationType.PROMOTIONAL, ChannelType.EMAIL, false);

        repository.clear();

        assertTrue(repository.findAll().isEmpty());
        assertFalse(repository.isKnownRecipient(1L));
        assertTrue(repository.isOptedIn(1L, NotificationType.PROMOTIONAL, ChannelType.EMAIL),
                "preferences must also be wiped by clear()");
    }

    @Test
    @DisplayName("Recipients: registerRecipient/isKnownRecipient/getRecipientName round-trip")
    void recipientDirectoryRoundTrips() {
        assertFalse(repository.isKnownRecipient(5L));
        repository.registerRecipient(5L, "Eve");
        assertTrue(repository.isKnownRecipient(5L));
        assertEquals("Eve", repository.getRecipientName(5L));
        assertEquals("Recipient 6", repository.getRecipientName(6L), "unknown id falls back to a generic label");
    }

    @Test
    @DisplayName("Preferences default to opted-in when no explicit record exists")
    void defaultOptedIn() {
        assertTrue(repository.isOptedIn(42L, NotificationType.PROMOTIONAL, ChannelType.SMS));
    }

    @Test
    @DisplayName("Preferences: explicit opt-out is scoped to exactly its (type, channel) pair")
    void preferenceIsScopedToTypeAndChannel() {
        repository.setPreference(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, false);

        assertFalse(repository.isOptedIn(1L, NotificationType.PROMOTIONAL, ChannelType.SMS));
        assertTrue(repository.isOptedIn(1L, NotificationType.PROMOTIONAL, ChannelType.EMAIL),
                "opt-out on SMS must not bleed into EMAIL");
        assertTrue(repository.isOptedIn(1L, NotificationType.TRANSACTIONAL, ChannelType.SMS),
                "opt-out on PROMOTIONAL must not bleed into TRANSACTIONAL");
        assertTrue(repository.isOptedIn(2L, NotificationType.PROMOTIONAL, ChannelType.SMS),
                "opt-out for user 1 must not bleed into user 2");
    }

    @Test
    @DisplayName("setPreference() can flip a preference back to opted-in")
    void preferenceCanBeFlippedBack() {
        repository.setPreference(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, false);
        assertFalse(repository.isOptedIn(1L, NotificationType.PROMOTIONAL, ChannelType.SMS));

        repository.setPreference(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, true);
        assertTrue(repository.isOptedIn(1L, NotificationType.PROMOTIONAL, ChannelType.SMS));
    }

    @Test
    @DisplayName("getPreferences(userId) returns only that user's preference records")
    void getPreferencesFiltersByUser() {
        repository.setPreference(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, false);
        repository.setPreference(1L, NotificationType.ALERT, ChannelType.PUSH, false);
        repository.setPreference(2L, NotificationType.PROMOTIONAL, ChannelType.EMAIL, false);

        List<?> forUser1 = repository.getPreferences(1L);
        assertEquals(2, forUser1.size());
        assertEquals(1, repository.getPreferences(2L).size());
        assertEquals(0, repository.getPreferences(3L).size());
    }

    @Test
    @DisplayName("The underlying stores are genuinely ConcurrentHashMap-backed, not single-threaded HashMaps")
    void storesAreConcurrentHashMapBacked() throws Exception {
        java.lang.reflect.Field notificationsField = NotificationRepository.class.getDeclaredField("notifications");
        notificationsField.setAccessible(true);
        assertInstanceOf(ConcurrentHashMap.class, notificationsField.get(repository));

        java.lang.reflect.Field preferencesField = NotificationRepository.class.getDeclaredField("preferences");
        preferencesField.setAccessible(true);
        assertInstanceOf(ConcurrentHashMap.class, preferencesField.get(repository));

        java.lang.reflect.Field recipientsField = NotificationRepository.class.getDeclaredField("recipientDirectory");
        recipientsField.setAccessible(true);
        assertInstanceOf(ConcurrentHashMap.class, recipientsField.get(repository));
    }
}

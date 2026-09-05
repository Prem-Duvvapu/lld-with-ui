package com.lld.notification.config;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationStatus;
import com.lld.notification.model.NotificationType;
import com.lld.notification.repository.NotificationRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;

/** Seeds the live repository with a small recipient directory, one opt-out preference, and a
 * handful of historical notifications so the UI shows something meaningful on first load. */
@Component
public class NotificationInitializer {
    private static final ZoneId ZONE_IST = ZoneId.of("Asia/Kolkata");

    private final NotificationRepository repository;

    public NotificationInitializer(NotificationRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        repository.registerRecipient(101L, "Alice Sharma");
        repository.registerRecipient(102L, "Bob Iyer");
        repository.registerRecipient(103L, "Charlie Rao");
        repository.registerRecipient(104L, "Diana Fernandes");

        // Charlie opted out of promotional SMS blasts; Diana opted out of promotional email.
        repository.setPreference(103L, NotificationType.PROMOTIONAL, ChannelType.SMS, false);
        repository.setPreference(104L, NotificationType.PROMOTIONAL, ChannelType.EMAIL, false);

        seedHistorical(101L, NotificationType.OTP, ChannelType.SMS, NotificationStatus.SENT,
                Map.of("otp", "482913"), 1, 12);
        seedHistorical(102L, NotificationType.TRANSACTIONAL, ChannelType.EMAIL, NotificationStatus.SENT,
                Map.of("orderId", "ORD-5521"), 1, 45);
        seedHistorical(103L, NotificationType.PROMOTIONAL, ChannelType.SMS, NotificationStatus.SUPPRESSED,
                Map.of("offer", "Flat 20% off"), 0, 90);
        seedHistorical(104L, NotificationType.ALERT, ChannelType.PUSH, NotificationStatus.FAILED,
                Map.of("alert", "Unusual login detected"), 3, 5);
    }

    private void seedHistorical(long recipientId, NotificationType type, ChannelType channel,
                                 NotificationStatus status, Map<String, String> templateData,
                                 int attemptCount, int minutesAgo) {
        LocalDateTime createdAt = LocalDateTime.now(ZONE_IST).minusMinutes(minutesAgo);
        Notification n = Notification.builder()
                .recipientId(recipientId)
                .type(type)
                .priority(type.defaultPriority())
                .channel(channel)
                .templateData(templateData)
                .status(status)
                .attemptCount(attemptCount)
                .idempotencyKey("SEED-" + recipientId + "-" + type)
                .createdAt(createdAt)
                .lastAttemptAt(attemptCount > 0 ? createdAt.plusSeconds(1) : null)
                .build();
        repository.save(n);
    }
}

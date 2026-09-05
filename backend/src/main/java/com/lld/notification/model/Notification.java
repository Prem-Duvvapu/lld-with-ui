package com.lld.notification.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/** One notification send attempt-set: everything needed to deliver it, and everything recorded
 * about how delivery went. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private Long id;
    private long recipientId;
    private NotificationType type;
    private Priority priority;
    private ChannelType channel;

    /** Placeholder data for the message body — no templating engine, just key/value pairs the
     * channel can interpolate (e.g. {@code {"otp": "482913"}}). */
    private Map<String, String> templateData;

    private NotificationStatus status;
    private int attemptCount;
    private String idempotencyKey;
    private String lastError;
    private LocalDateTime createdAt;
    private LocalDateTime lastAttemptAt;
}

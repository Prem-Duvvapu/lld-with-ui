package com.lld.notification.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One user's opt-in/opt-out choice for a (NotificationType, ChannelType) pair. Absence of a
 * record for a pair means opted-in by default — see
 * {@code NotificationRepository#isOptedIn}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreference {
    private long userId;
    private NotificationType type;
    private ChannelType channel;
    private boolean optedIn;
}

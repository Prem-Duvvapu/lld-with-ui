package com.lld.library.observer;

import com.lld.library.enums.NotificationType;

public interface LibraryNotificationObserver {
    void onNotification(String memberId, NotificationType type, String message, String referenceId);
}

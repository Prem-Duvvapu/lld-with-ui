package com.lld.library.observer;

import com.lld.library.enums.NotificationType;
import org.springframework.stereotype.Component;

@Component
public class LoggingLibraryNotificationObserver implements LibraryNotificationObserver {

    @Override
    public void onNotification(String memberId, NotificationType type, String message, String referenceId) {
        System.out.println(String.format("[LIBRARY-NOTIF] Member: %s | Type: %s | Ref: %s | %s",
                memberId, type, referenceId, message));
    }
}

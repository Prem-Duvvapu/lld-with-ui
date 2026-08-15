package com.lld.linkedin.observer;

import com.lld.linkedin.model.Notification;

public interface NotificationObserver {
    void onNotification(Notification notification);
}

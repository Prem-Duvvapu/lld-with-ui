package com.lld.library.observer;

import com.lld.library.enums.NotificationType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class DueDateNotifier {
    private final List<LibraryNotificationObserver> observers = new CopyOnWriteArrayList<>();

    public void registerObserver(LibraryNotificationObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(LibraryNotificationObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public void notifyObservers(String memberId, NotificationType type, String message, String referenceId) {
        for (LibraryNotificationObserver observer : observers) {
            try {
                observer.onNotification(memberId, type, message, referenceId);
            } catch (Exception e) {
                System.err.println("Error in LibraryNotificationObserver: " + e.getMessage());
            }
        }
    }
}

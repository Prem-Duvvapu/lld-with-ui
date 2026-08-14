package com.lld.movieticket.observer;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.SeatStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SeatMapNotifier {
    private final List<SeatAvailabilityObserver> observers = new CopyOnWriteArrayList<>();

    public void addObserver(SeatAvailabilityObserver observer) {
        observers.add(observer);
    }

    public void removeObserver(SeatAvailabilityObserver observer) {
        observers.remove(observer);
    }

    public void notifyStatusChange(long showId, Seat seat, SeatStatus prevStatus, SeatStatus newStatus, String actorUserId) {
        for (SeatAvailabilityObserver obs : observers) {
            try {
                obs.onSeatStatusChanged(showId, seat, prevStatus, newStatus, actorUserId);
            } catch (Exception ignored) {}
        }
    }
}

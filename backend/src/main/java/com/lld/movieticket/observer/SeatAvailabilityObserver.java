package com.lld.movieticket.observer;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.SeatStatus;

public interface SeatAvailabilityObserver {
    void onSeatStatusChanged(long showId, Seat seat, SeatStatus previousStatus, SeatStatus newStatus, String actorUserId);
}

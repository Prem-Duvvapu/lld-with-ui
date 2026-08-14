package com.lld.movieticket.factory;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.SeatStatus;
import com.lld.movieticket.model.SeatType;

public class SeatFactory {

    public static Seat createSeat(long seatId, long showId, int row, int col, SeatType seatType) {
        double price = switch (seatType) {
            case PLATINUM -> 500.0;
            case GOLD -> 350.0;
            case SILVER -> 200.0;
        };
        return new Seat(seatId, showId, row, col, seatType, price, SeatStatus.AVAILABLE);
    }

    public static Seat createSeat(long seatId, long showId, int row, int col, SeatType seatType, double customPrice) {
        return new Seat(seatId, showId, row, col, seatType, customPrice, SeatStatus.AVAILABLE);
    }
}

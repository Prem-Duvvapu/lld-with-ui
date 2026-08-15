package com.lld.airline.model;

import com.lld.airline.enums.SeatClass;

public class SeatTemplate {
    private final String seatNumber;
    private final SeatClass seatClass;
    private final boolean isWindow;
    private final boolean isAisle;

    public SeatTemplate(String seatNumber, SeatClass seatClass, boolean isWindow, boolean isAisle) {
        this.seatNumber = seatNumber;
        this.seatClass = seatClass != null ? seatClass : SeatClass.ECONOMY;
        this.isWindow = isWindow;
        this.isAisle = isAisle;
    }

    public String getSeatNumber() {
        return seatNumber;
    }

    public SeatClass getSeatClass() {
        return seatClass;
    }

    public boolean isWindow() {
        return isWindow;
    }

    public boolean isAisle() {
        return isAisle;
    }
}

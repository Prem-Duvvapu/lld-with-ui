package com.lld.airline.model;

import com.lld.airline.enums.SeatClass;
import com.lld.airline.enums.SeatStatus;

public class Seat {
    private final String seatNumber;
    private final SeatClass seatClass;
    private final double basePrice;
    private volatile SeatStatus status;
    private volatile String heldByUserId;
    private volatile long holdExpiresAt;
    private volatile long version;

    public Seat(String seatNumber, SeatClass seatClass, double basePrice) {
        this.seatNumber = seatNumber;
        this.seatClass = seatClass != null ? seatClass : SeatClass.ECONOMY;
        this.basePrice = basePrice;
        this.status = SeatStatus.AVAILABLE;
        this.heldByUserId = null;
        this.holdExpiresAt = 0L;
        this.version = 0L;
    }

    public String getSeatNumber() {
        return seatNumber;
    }

    public SeatClass getSeatClass() {
        return seatClass;
    }

    public double getBasePrice() {
        return basePrice;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }

    public String getHeldByUserId() {
        return heldByUserId;
    }

    public void setHeldByUserId(String heldByUserId) {
        this.heldByUserId = heldByUserId;
    }

    public long getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public void setHoldExpiresAt(long holdExpiresAt) {
        this.holdExpiresAt = holdExpiresAt;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }

    public boolean isAvailable(long now) {
        if (status == SeatStatus.AVAILABLE) return true;
        if (status == SeatStatus.HELD && now > holdExpiresAt) return true;
        return false;
    }
}

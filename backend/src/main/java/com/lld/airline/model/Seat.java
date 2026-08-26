package com.lld.airline.model;

import com.lld.airline.enums.SeatClass;
import com.lld.airline.enums.SeatStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Seat {
    private String seatNumber;
    private SeatClass seatClass;
    private double basePrice;
    @Builder.Default
    private volatile SeatStatus status = SeatStatus.AVAILABLE;
    private volatile String heldByUserId;
    private volatile long holdExpiresAt;
    private volatile long version;

    /** Free right now, or was HELD but the hold's TTL has already lapsed. */
    public boolean isAvailable(long now) {
        if (status == SeatStatus.AVAILABLE) return true;
        return status == SeatStatus.HELD && now > holdExpiresAt;
    }
}

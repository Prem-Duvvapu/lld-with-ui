package com.lld.concertticket.model;

import com.lld.concertticket.enums.SeatStatus;
import com.lld.concertticket.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One bookable seat for one event. Seats are per-event copies (an id like
 * "VIP-A-1" is only unique within its event's seat map — the same physical venue seat
 * gets a fresh AVAILABLE row for every event scheduled there), mirroring how
 * {@code movieticket} indexes seats per show rather than per screen.
 *
 * <p>Status is only ever mutated through {@code SeatLockManager} under the seat's
 * per-seat lock — never directly by the service — so hold/confirm/release stay atomic
 * with respect to a concurrent reader of the same seat.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {
    private String id;
    private long eventId;
    private SeatType seatType;
    private String row;
    private int number;
    private double price;
    private SeatStatus status;
    private String heldByUserId;
    private long holdExpiresAt;
    private long version;
}

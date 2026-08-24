package com.lld.concertticket.model;

import com.lld.concertticket.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A pricing/layout template for one seating tier of a {@link Venue} — e.g. "VIP: 2 rows
 * x 6 seats @ Rs 5000". Used by the initializer/service to stamp out the actual
 * {@link Seat} instances for a given {@link Event}; the section itself carries no
 * booking state.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Section {
    private SeatType seatType;
    private int rows;
    private int seatsPerRow;
    private double price;

    public int totalSeats() {
        return rows * seatsPerRow;
    }
}

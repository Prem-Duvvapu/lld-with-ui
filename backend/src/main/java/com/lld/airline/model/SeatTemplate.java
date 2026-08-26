package com.lld.airline.model;

import com.lld.airline.enums.SeatClass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A seat slot on an {@link Aircraft}'s layout, independent of any particular flight or price. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatTemplate {
    private String seatNumber;
    private SeatClass seatClass;
    private boolean window;
    private boolean aisle;
}

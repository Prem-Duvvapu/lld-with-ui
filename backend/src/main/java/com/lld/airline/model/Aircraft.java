package com.lld.airline.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Aircraft {
    private String model;
    private String tailNumber;
    private List<SeatTemplate> seatTemplates;

    /** Defensive-copy factory — the seat layout is fixed once an aircraft is registered. */
    public static Aircraft of(String model, String tailNumber, List<SeatTemplate> seatTemplates) {
        return Aircraft.builder()
                .model(model)
                .tailNumber(tailNumber)
                .seatTemplates(seatTemplates != null ? List.copyOf(seatTemplates) : List.of())
                .build();
    }

    public int getTotalSeats() {
        return seatTemplates != null ? seatTemplates.size() : 0;
    }
}

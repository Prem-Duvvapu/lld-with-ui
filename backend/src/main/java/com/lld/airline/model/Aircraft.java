package com.lld.airline.model;

import java.util.Collections;
import java.util.List;

public class Aircraft {
    private final String model;
    private final String tailNumber;
    private final List<SeatTemplate> seatTemplates;

    public Aircraft(String model, String tailNumber, List<SeatTemplate> seatTemplates) {
        this.model = model;
        this.tailNumber = tailNumber;
        this.seatTemplates = seatTemplates != null ? List.copyOf(seatTemplates) : List.of();
    }

    public String getModel() {
        return model;
    }

    public String getTailNumber() {
        return tailNumber;
    }

    public List<SeatTemplate> getSeatTemplates() {
        return Collections.unmodifiableList(seatTemplates);
    }

    public int getTotalSeats() {
        return seatTemplates.size();
    }
}

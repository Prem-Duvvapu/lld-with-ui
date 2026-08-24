package com.lld.hotel.strategy;

import com.lld.hotel.model.Room;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Flat per-night rate — every night of the stay costs the room's listed price. */
@Component
public class StandardTariffStrategy implements TariffStrategy {

    @Override
    public String getName() {
        return "STANDARD";
    }

    @Override
    public double calculateTariff(Room room, LocalDate checkIn, LocalDate checkOut) {
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        double total = room.getPrice() * nights;
        return round(total);
    }

    static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

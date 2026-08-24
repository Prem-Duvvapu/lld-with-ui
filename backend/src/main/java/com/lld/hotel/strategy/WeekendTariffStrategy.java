package com.lld.hotel.strategy;

import com.lld.hotel.model.Room;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Prices night-by-night: Friday and Saturday nights carry a surcharge, every other night is the
 * room's standard rate. Chosen automatically by {@link TariffStrategyFactory} whenever the stay
 * includes at least one such night, so a five-night stay that only touches one weekend night is
 * not charged the surcharge for the whole stay.
 */
@Component
public class WeekendTariffStrategy implements TariffStrategy {

    public static final double WEEKEND_SURCHARGE_MULTIPLIER = 1.25;

    @Override
    public String getName() {
        return "WEEKEND_SURCHARGE";
    }

    @Override
    public double calculateTariff(Room room, LocalDate checkIn, LocalDate checkOut) {
        double total = 0.0;
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            DayOfWeek day = night.getDayOfWeek();
            double nightlyRate = (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY)
                    ? room.getPrice() * WEEKEND_SURCHARGE_MULTIPLIER
                    : room.getPrice();
            total += nightlyRate;
        }
        return StandardTariffStrategy.round(total);
    }
}

package com.lld.hotel.strategy;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;

/** Resolves the pricing strategy for a stay, based purely on the dates requested. */
@Component
public class TariffStrategyFactory {

    private final StandardTariffStrategy standard;
    private final WeekendTariffStrategy weekend;

    public TariffStrategyFactory(StandardTariffStrategy standard, WeekendTariffStrategy weekend) {
        this.standard = standard;
        this.weekend = weekend;
    }

    /** A stay that touches at least one Friday or Saturday night prices under the weekend rule. */
    public TariffStrategy resolve(LocalDate checkIn, LocalDate checkOut) {
        return hasWeekendNight(checkIn, checkOut) ? weekend : standard;
    }

    private boolean hasWeekendNight(LocalDate checkIn, LocalDate checkOut) {
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            DayOfWeek day = night.getDayOfWeek();
            if (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY) {
                return true;
            }
        }
        return false;
    }

    public StandardTariffStrategy standard() {
        return standard;
    }

    public WeekendTariffStrategy weekend() {
        return weekend;
    }
}

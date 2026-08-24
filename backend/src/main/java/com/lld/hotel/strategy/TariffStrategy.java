package com.lld.hotel.strategy;

import com.lld.hotel.model.Room;

import java.time.LocalDate;

/**
 * Strategy for turning a room and a stay into a price.
 *
 * <p>Pricing used to be a single {@code room.getPrice() * nights} multiplication inlined at the
 * one call site inside {@code HotelService.bookRoom()} — no room for a weekend surcharge or a
 * seasonal rate without another inline branch. One implementation per pricing rule now, resolved
 * by {@link TariffStrategyFactory}.
 */
public interface TariffStrategy {

    /** Identifier surfaced to the UI, the booking record and the simulation event log. */
    String getName();

    /**
     * @param room     the room being priced
     * @param checkIn  first night of the stay (inclusive)
     * @param checkOut day the guest leaves (exclusive) — the stay is {@code [checkIn, checkOut)}
     * @return total tariff for the whole stay, rounded to paise
     */
    double calculateTariff(Room room, LocalDate checkIn, LocalDate checkOut);
}

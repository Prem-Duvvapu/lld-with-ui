package com.lld.hotel.strategy;

/** Shared money rounding so tariff and refund math agree on paise. */
final class StandardTariffRounding {
    private StandardTariffRounding() {
    }

    static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

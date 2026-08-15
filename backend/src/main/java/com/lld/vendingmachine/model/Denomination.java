package com.lld.vendingmachine.model;

public enum Denomination {
    COIN_1(1, "COIN"),
    COIN_2(2, "COIN"),
    COIN_5(5, "COIN"),
    COIN_10(10, "COIN"),
    NOTE_20(20, "NOTE"),
    NOTE_50(50, "NOTE"),
    NOTE_100(100, "NOTE"),
    NOTE_500(500, "NOTE");

    private final int value;
    private final String type;

    Denomination(int value, String type) {
        this.value = value;
        this.type = type;
    }

    public int getValue() {
        return value;
    }

    public String getType() {
        return type;
    }

    public static Denomination fromValue(int value) {
        for (Denomination d : values()) {
            if (d.value == value) {
                return d;
            }
        }
        throw new IllegalArgumentException("Unsupported denomination value: " + value);
    }
}

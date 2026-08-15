package com.lld.coffeemachine.model;

public enum CoffeeType {
    ESPRESSO("Espresso", 80.0, "☕"),
    LATTE("Caffe Latte", 120.0, "🥛"),
    CAPPUCCINO("Cappuccino", 130.0, "☕"),
    AMERICANO("Caffe Americano", 90.0, "💧"),
    MOCHA("Caffe Mocha", 150.0, "🍫");

    private final String displayName;
    private final double basePrice;
    private final String emoji;

    CoffeeType(String displayName, double basePrice, String emoji) {
        this.displayName = displayName;
        this.basePrice = basePrice;
        this.emoji = emoji;
    }

    public String getDisplayName() {
        return displayName;
    }

    public double getBasePrice() {
        return basePrice;
    }

    public String getEmoji() {
        return emoji;
    }
}

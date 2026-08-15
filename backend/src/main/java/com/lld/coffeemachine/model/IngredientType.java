package com.lld.coffeemachine.model;

public enum IngredientType {
    WATER("ml"),
    MILK("ml"),
    COFFEE_BEANS("g"),
    SUGAR("g"),
    WHIPPED_CREAM("g"),
    CARAMEL_SYRUP("ml"),
    OAT_MILK("ml");

    private final String unit;

    IngredientType(String unit) {
        this.unit = unit;
    }

    public String getUnit() {
        return unit;
    }
}

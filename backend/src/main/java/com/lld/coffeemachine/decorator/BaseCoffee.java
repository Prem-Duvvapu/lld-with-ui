package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.CoffeeType;
import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class BaseCoffee implements CoffeeComponent {
    private final CoffeeType type;
    private final String description;
    private final double price;
    private final Map<IngredientType, Integer> baseIngredients;

    public BaseCoffee(CoffeeType type, String description, double price, Map<IngredientType, Integer> baseIngredients) {
        this.type = type;
        this.description = description;
        this.price = price;
        this.baseIngredients = new EnumMap<>(IngredientType.class);
        if (baseIngredients != null) {
            this.baseIngredients.putAll(baseIngredients);
        }
    }

    @Override
    public String getDescription() {
        return description;
    }

    @Override
    public double getPrice() {
        return price;
    }

    @Override
    public Map<IngredientType, Integer> getRequiredIngredients() {
        return new EnumMap<>(baseIngredients);
    }

    public CoffeeType getType() {
        return type;
    }
}

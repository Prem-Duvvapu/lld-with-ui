package com.lld.coffeemachine.factory;

import com.lld.coffeemachine.model.CoffeeType;
import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class CoffeeRecipe {
    private final CoffeeType type;
    private final String name;
    private final String description;
    private final double basePrice;
    private final String emoji;
    private final Map<IngredientType, Integer> ingredients;

    public CoffeeRecipe(CoffeeType type, String name, String description, double basePrice, String emoji, Map<IngredientType, Integer> ingredients) {
        this.type = type;
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.emoji = emoji;
        this.ingredients = new EnumMap<>(IngredientType.class);
        if (ingredients != null) {
            this.ingredients.putAll(ingredients);
        }
    }

    public CoffeeType getType() {
        return type;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public double getBasePrice() {
        return basePrice;
    }

    public String getEmoji() {
        return emoji;
    }

    public Map<IngredientType, Integer> getIngredients() {
        return new EnumMap<>(ingredients);
    }
}

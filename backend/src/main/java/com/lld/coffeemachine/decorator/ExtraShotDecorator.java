package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class ExtraShotDecorator extends CoffeeDecorator {
    private static final double EXTRA_SHOT_PRICE = 40.0;

    public ExtraShotDecorator(CoffeeComponent decoratedCoffee) {
        super(decoratedCoffee);
    }

    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", Extra Espresso Shot";
    }

    @Override
    public double getPrice() {
        return decoratedCoffee.getPrice() + EXTRA_SHOT_PRICE;
    }

    @Override
    protected Map<IngredientType, Integer> getAddedIngredients() {
        Map<IngredientType, Integer> added = new EnumMap<>(IngredientType.class);
        added.put(IngredientType.COFFEE_BEANS, 10);
        added.put(IngredientType.WATER, 30);
        return added;
    }
}

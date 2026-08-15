package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class ExtraMilkDecorator extends CoffeeDecorator {
    private static final double EXTRA_MILK_PRICE = 20.0;

    public ExtraMilkDecorator(CoffeeComponent decoratedCoffee) {
        super(decoratedCoffee);
    }

    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", Extra Steamed Milk";
    }

    @Override
    public double getPrice() {
        return decoratedCoffee.getPrice() + EXTRA_MILK_PRICE;
    }

    @Override
    protected Map<IngredientType, Integer> getAddedIngredients() {
        Map<IngredientType, Integer> added = new EnumMap<>(IngredientType.class);
        added.put(IngredientType.MILK, 60);
        return added;
    }
}

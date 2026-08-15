package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class WhippedCreamDecorator extends CoffeeDecorator {
    private static final double WHIPPED_CREAM_PRICE = 30.0;

    public WhippedCreamDecorator(CoffeeComponent decoratedCoffee) {
        super(decoratedCoffee);
    }

    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", Whipped Cream";
    }

    @Override
    public double getPrice() {
        return decoratedCoffee.getPrice() + WHIPPED_CREAM_PRICE;
    }

    @Override
    protected Map<IngredientType, Integer> getAddedIngredients() {
        Map<IngredientType, Integer> added = new EnumMap<>(IngredientType.class);
        added.put(IngredientType.WHIPPED_CREAM, 25);
        return added;
    }
}

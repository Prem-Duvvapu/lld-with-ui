package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class CaramelSyrupDecorator extends CoffeeDecorator {
    private static final double CARAMEL_PRICE = 25.0;

    public CaramelSyrupDecorator(CoffeeComponent decoratedCoffee) {
        super(decoratedCoffee);
    }

    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", Caramel Syrup";
    }

    @Override
    public double getPrice() {
        return decoratedCoffee.getPrice() + CARAMEL_PRICE;
    }

    @Override
    protected Map<IngredientType, Integer> getAddedIngredients() {
        Map<IngredientType, Integer> added = new EnumMap<>(IngredientType.class);
        added.put(IngredientType.CARAMEL_SYRUP, 20);
        return added;
    }
}

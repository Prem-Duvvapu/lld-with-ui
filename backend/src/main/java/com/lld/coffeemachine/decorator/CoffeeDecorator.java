package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public abstract class CoffeeDecorator implements CoffeeComponent {
    protected final CoffeeComponent decoratedCoffee;

    public CoffeeDecorator(CoffeeComponent decoratedCoffee) {
        if (decoratedCoffee == null) {
            throw new IllegalArgumentException("Wrapped CoffeeComponent cannot be null");
        }
        this.decoratedCoffee = decoratedCoffee;
    }

    @Override
    public Map<IngredientType, Integer> getRequiredIngredients() {
        Map<IngredientType, Integer> combined = new EnumMap<>(IngredientType.class);
        combined.putAll(decoratedCoffee.getRequiredIngredients());
        getAddedIngredients().forEach((k, v) -> combined.merge(k, v, Integer::sum));
        return combined;
    }

    protected abstract Map<IngredientType, Integer> getAddedIngredients();

    public CoffeeComponent getDecoratedCoffee() {
        return decoratedCoffee;
    }
}

package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;

import java.util.EnumMap;
import java.util.Map;

public class OatMilkDecorator extends CoffeeDecorator {
    private static final double OAT_MILK_PRICE = 35.0;

    public OatMilkDecorator(CoffeeComponent decoratedCoffee) {
        super(decoratedCoffee);
    }

    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", Oat Milk Sub";
    }

    @Override
    public double getPrice() {
        return decoratedCoffee.getPrice() + OAT_MILK_PRICE;
    }

    @Override
    public Map<IngredientType, Integer> getRequiredIngredients() {
        Map<IngredientType, Integer> combined = new EnumMap<>(IngredientType.class);
        combined.putAll(decoratedCoffee.getRequiredIngredients());
        // Remove standard dairy milk requirement if present
        int dairyMilkAmount = combined.getOrDefault(IngredientType.MILK, 0);
        combined.remove(IngredientType.MILK);

        // Substitute with Oat Milk
        int oatMilkNeeded = dairyMilkAmount > 0 ? dairyMilkAmount : 150;
        combined.merge(IngredientType.OAT_MILK, oatMilkNeeded, Integer::sum);
        return combined;
    }

    @Override
    protected Map<IngredientType, Integer> getAddedIngredients() {
        Map<IngredientType, Integer> added = new EnumMap<>(IngredientType.class);
        added.put(IngredientType.OAT_MILK, 150);
        return added;
    }
}

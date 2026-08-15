package com.lld.coffeemachine.decorator;

import com.lld.coffeemachine.model.IngredientType;
import java.util.Map;

public interface CoffeeComponent {
    String getDescription();
    double getPrice();
    Map<IngredientType, Integer> getRequiredIngredients();
}

package com.lld.coffeemachine.factory;

import com.lld.coffeemachine.decorator.BaseCoffee;
import com.lld.coffeemachine.decorator.CoffeeComponent;
import com.lld.coffeemachine.exception.InvalidCoffeeTypeException;
import com.lld.coffeemachine.model.CoffeeType;
import com.lld.coffeemachine.model.IngredientType;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class CoffeeFactory {
    private final Map<CoffeeType, CoffeeRecipe> recipeRegistry = new ConcurrentHashMap<>();

    public CoffeeFactory() {
        registerDefaultRecipes();
    }

    public void registerRecipe(CoffeeRecipe recipe) {
        if (recipe == null) throw new IllegalArgumentException("Recipe cannot be null");
        recipeRegistry.put(recipe.getType(), recipe);
    }

    public CoffeeComponent createBaseCoffee(CoffeeType type) {
        CoffeeRecipe recipe = recipeRegistry.get(type);
        if (recipe == null) {
            throw new InvalidCoffeeTypeException("Coffee type " + type + " is not registered in the factory.");
        }
        return new BaseCoffee(recipe.getType(), recipe.getName(), recipe.getBasePrice(), recipe.getIngredients());
    }

    public CoffeeRecipe getRecipe(CoffeeType type) {
        return recipeRegistry.get(type);
    }

    public List<CoffeeRecipe> getAllRecipes() {
        return new ArrayList<>(recipeRegistry.values());
    }

    private void registerDefaultRecipes() {
        // 1. Espresso
        Map<IngredientType, Integer> espresso = new EnumMap<>(IngredientType.class);
        espresso.put(IngredientType.COFFEE_BEANS, 18);
        espresso.put(IngredientType.WATER, 50);
        registerRecipe(new CoffeeRecipe(CoffeeType.ESPRESSO, "Espresso", "Rich single-origin concentrated shot", 80.0, "☕", espresso));

        // 2. Caffe Latte
        Map<IngredientType, Integer> latte = new EnumMap<>(IngredientType.class);
        latte.put(IngredientType.COFFEE_BEANS, 18);
        latte.put(IngredientType.WATER, 60);
        latte.put(IngredientType.MILK, 150);
        latte.put(IngredientType.SUGAR, 10);
        registerRecipe(new CoffeeRecipe(CoffeeType.LATTE, "Caffe Latte", "Espresso with silky steamed milk & light microfoam", 120.0, "🥛", latte));

        // 3. Cappuccino
        Map<IngredientType, Integer> cappuccino = new EnumMap<>(IngredientType.class);
        cappuccino.put(IngredientType.COFFEE_BEANS, 18);
        cappuccino.put(IngredientType.WATER, 60);
        cappuccino.put(IngredientType.MILK, 100);
        cappuccino.put(IngredientType.SUGAR, 10);
        registerRecipe(new CoffeeRecipe(CoffeeType.CAPPUCCINO, "Cappuccino", "Balanced espresso with equal parts steamed milk & velvety foam", 130.0, "☕", cappuccino));

        // 4. Caffe Americano
        Map<IngredientType, Integer> americano = new EnumMap<>(IngredientType.class);
        americano.put(IngredientType.COFFEE_BEANS, 18);
        americano.put(IngredientType.WATER, 150);
        registerRecipe(new CoffeeRecipe(CoffeeType.AMERICANO, "Caffe Americano", "Double shot diluted with hot purified water", 90.0, "💧", americano));

        // 5. Caffe Mocha
        Map<IngredientType, Integer> mocha = new EnumMap<>(IngredientType.class);
        mocha.put(IngredientType.COFFEE_BEANS, 18);
        mocha.put(IngredientType.WATER, 60);
        mocha.put(IngredientType.MILK, 120);
        mocha.put(IngredientType.CARAMEL_SYRUP, 20);
        mocha.put(IngredientType.SUGAR, 10);
        registerRecipe(new CoffeeRecipe(CoffeeType.MOCHA, "Caffe Mocha", "Espresso infused with caramel & dark cocoa notes", 150.0, "🍫", mocha));
    }
}

package com.lld.coffeemachine.model;

import java.util.Map;

public class CoffeeMachine {
    private long id;
    private String status;
    private String currentBeverage;
    private Map<Ingredient, Integer> ingredients;

    public CoffeeMachine() {}

    public CoffeeMachine(long id, String status, String currentBeverage, Map<Ingredient, Integer> ingredients) {
        this.id = id;
        this.status = status;
        this.currentBeverage = currentBeverage;
        this.ingredients = ingredients;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCurrentBeverage() { return currentBeverage; }
    public void setCurrentBeverage(String currentBeverage) { this.currentBeverage = currentBeverage; }
    public Map<Ingredient, Integer> getIngredients() { return ingredients; }
    public void setIngredients(Map<Ingredient, Integer> ingredients) { this.ingredients = ingredients; }
}
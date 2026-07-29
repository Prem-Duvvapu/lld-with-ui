package com.lld.coffeemachine.model;

import java.util.Map;

public class Beverage {
    private long id;
    private String name;
    private double price;
    private Map<Ingredient, Integer> recipe;
    private boolean available;

    public Beverage() {}

    public Beverage(long id, String name, double price, Map<Ingredient, Integer> recipe, boolean available) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.recipe = recipe;
        this.available = available;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public Map<Ingredient, Integer> getRecipe() { return recipe; }
    public void setRecipe(Map<Ingredient, Integer> recipe) { this.recipe = recipe; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
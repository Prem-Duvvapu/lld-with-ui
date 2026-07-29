package com.lld.coffeemachine.repository;

import com.lld.coffeemachine.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class CoffeeRepository {
    private final Map<Long, Beverage> beverages = new ConcurrentHashMap<>();
    private final CoffeeMachine machine;
    private final AtomicLong orderIdGen = new AtomicLong(1);
    private final List<Order> orders = Collections.synchronizedList(new ArrayList<>());

    public CoffeeRepository() {
        Map<Ingredient, Integer> inventory = new HashMap<>();
        inventory.put(Ingredient.COFFEE_BEANS, 100);
        inventory.put(Ingredient.MILK, 1000);
        inventory.put(Ingredient.WATER, 2000);
        inventory.put(Ingredient.SUGAR, 500);
        inventory.put(Ingredient.CHOCOLATE, 200);
        inventory.put(Ingredient.CREAM, 200);
        machine = new CoffeeMachine(1, "IDLE", null, inventory);

        beverages.put(1L, new Beverage(1, "Espresso", 120.0, Map.of(
            Ingredient.COFFEE_BEANS, 10, Ingredient.WATER, 50
        ), true));
        beverages.put(2L, new Beverage(2, "Latte", 150.0, Map.of(
            Ingredient.COFFEE_BEANS, 10, Ingredient.MILK, 200, Ingredient.WATER, 50
        ), true));
        beverages.put(3L, new Beverage(3, "Cappuccino", 160.0, Map.of(
            Ingredient.COFFEE_BEANS, 10, Ingredient.MILK, 100, Ingredient.WATER, 50, Ingredient.CREAM, 10
        ), true));
        beverages.put(4L, new Beverage(4, "Mocha", 180.0, Map.of(
            Ingredient.COFFEE_BEANS, 10, Ingredient.MILK, 150, Ingredient.CHOCOLATE, 20, Ingredient.WATER, 30
        ), true));
        beverages.put(5L, new Beverage(5, "Americano", 130.0, Map.of(
            Ingredient.COFFEE_BEANS, 10, Ingredient.WATER, 150
        ), true));
    }

    public List<Beverage> getBeverages() { return new ArrayList<>(beverages.values()); }
    public Beverage getBeverage(Long id) { return beverages.get(id); }
    public CoffeeMachine getMachine() { return machine; }
    public long nextOrderId() { return orderIdGen.getAndIncrement(); }
    public void addOrder(Order order) { orders.add(order); }
    public List<Order> getOrders() { return new ArrayList<>(orders); }
}
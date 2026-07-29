package com.lld.coffeemachine.service;

import com.lld.coffeemachine.model.*;
import com.lld.coffeemachine.repository.CoffeeRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class CoffeeMachineService {
    private final CoffeeRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public CoffeeMachineService(CoffeeRepository repository) {
        this.repository = repository;
    }

    public List<Beverage> getMenu() {
        return repository.getBeverages();
    }

    public Map<String, Object> getStatus() {
        CoffeeMachine machine = repository.getMachine();
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("id", machine.getId());
        status.put("status", machine.getStatus());
        status.put("currentBeverage", machine.getCurrentBeverage());
        status.put("ingredients", machine.getIngredients());
        return status;
    }

    public Map<String, Object> selectBeverage(Long beverageId) {
        lock.lock();
        try {
            CoffeeMachine machine = repository.getMachine();
            if (!"IDLE".equals(machine.getStatus())) {
                throw new IllegalStateException("Machine is currently " + machine.getStatus());
            }
            Beverage beverage = repository.getBeverage(beverageId);
            if (beverage == null) throw new IllegalArgumentException("Beverage not found");
            if (!beverage.isAvailable()) throw new IllegalArgumentException("Beverage not available");

            Map<Ingredient, Integer> inventory = machine.getIngredients();
            Map<Ingredient, Integer> recipe = beverage.getRecipe();
            List<String> missing = new ArrayList<>();
            for (Map.Entry<Ingredient, Integer> entry : recipe.entrySet()) {
                int current = inventory.getOrDefault(entry.getKey(), 0);
                if (current < entry.getValue()) {
                    missing.add(entry.getKey().name());
                }
            }
            if (!missing.isEmpty()) {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("success", false);
                result.put("message", "Insufficient ingredients: " + String.join(", ", missing));
                result.put("missing", missing);
                return result;
            }

            machine.setCurrentBeverage(beverage.getName());
            return Map.of("success", true, "message", beverage.getName() + " selected", "beverage", beverage.getName());
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> brew(Long beverageId) {
        lock.lock();
        try {
            CoffeeMachine machine = repository.getMachine();
            Beverage beverage = repository.getBeverage(beverageId);
            if (beverage == null) throw new IllegalArgumentException("Beverage not found");

            Map<Ingredient, Integer> inventory = machine.getIngredients();
            Map<Ingredient, Integer> recipe = beverage.getRecipe();

            for (Map.Entry<Ingredient, Integer> entry : recipe.entrySet()) {
                int current = inventory.getOrDefault(entry.getKey(), 0);
                if (current < entry.getValue()) {
                    machine.setStatus("ERROR");
                    machine.setCurrentBeverage(null);
                    Order order = new Order(repository.nextOrderId(), beverageId, beverage.getName(), LocalDateTime.now(), "FAILED");
                    repository.addOrder(order);
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("success", false);
                    result.put("message", "Insufficient " + entry.getKey());
                    result.put("order", order);
                    return result;
                }
            }

            for (Map.Entry<Ingredient, Integer> entry : recipe.entrySet()) {
                inventory.put(entry.getKey(), inventory.get(entry.getKey()) - entry.getValue());
            }

            machine.setStatus("BREWING");
            Order order = new Order(repository.nextOrderId(), beverageId, beverage.getName(), LocalDateTime.now(), "PREPARING");
            repository.addOrder(order);

            try { Thread.sleep(1500); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }

            machine.setStatus("COMPLETE");
            order.setStatus("COMPLETED");

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("message", beverage.getName() + " is ready!");
            result.put("order", order);
            return result;
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> resetMachine() {
        lock.lock();
        try {
            CoffeeMachine machine = repository.getMachine();
            machine.setStatus("IDLE");
            machine.setCurrentBeverage(null);
            return Map.of("success", true, "message", "Machine reset to IDLE");
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> refillIngredient(String ingredientName, int amount) {
        lock.lock();
        try {
            Ingredient ingredient = Ingredient.valueOf(ingredientName.toUpperCase());
            CoffeeMachine machine = repository.getMachine();
            Map<Ingredient, Integer> inventory = machine.getIngredients();
            inventory.put(ingredient, inventory.getOrDefault(ingredient, 0) + amount);
            return Map.of("success", true, "message", ingredient + " refilled by " + amount, "newLevel", inventory.get(ingredient));
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "message", "Invalid ingredient: " + ingredientName);
        } finally {
            lock.unlock();
        }
    }

    public List<Order> getOrders() {
        return repository.getOrders();
    }
}
package com.lld.coffeemachine.store;

import com.lld.coffeemachine.exception.InsufficientIngredientException;
import com.lld.coffeemachine.model.IngredientType;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class IngredientStore {
    private final Map<IngredientType, AtomicInteger> inventory = new ConcurrentHashMap<>();
    private final Map<IngredientType, ReentrantLock> ingredientLocks = new ConcurrentHashMap<>();
    private final Map<IngredientType, Integer> capacities = new ConcurrentHashMap<>();
    private final Map<IngredientType, Integer> lowStockThresholds = new ConcurrentHashMap<>();

    public IngredientStore() {
        for (IngredientType type : IngredientType.values()) {
            inventory.put(type, new AtomicInteger(0));
            ingredientLocks.put(type, new ReentrantLock());
            capacities.put(type, 2000);
            lowStockThresholds.put(type, 100);
        }
    }

    public void initIngredient(IngredientType type, int currentStock, int capacity, int threshold) {
        inventory.computeIfAbsent(type, k -> new AtomicInteger(0)).set(currentStock);
        ingredientLocks.computeIfAbsent(type, k -> new ReentrantLock());
        capacities.put(type, capacity);
        lowStockThresholds.put(type, threshold);
    }

    public void refill(IngredientType type, int amount) {
        ReentrantLock lock = ingredientLocks.get(type);
        lock.lock();
        try {
            int current = inventory.get(type).get();
            int maxCap = capacities.getOrDefault(type, 2000);
            int newAmount = Math.min(maxCap, current + amount);
            inventory.get(type).set(newAmount);
        } finally {
            lock.unlock();
        }
    }

    public int getStock(IngredientType type) {
        AtomicInteger val = inventory.get(type);
        return val != null ? val.get() : 0;
    }

    public Map<IngredientType, Integer> getAllStock() {
        Map<IngredientType, Integer> snapshot = new EnumMap<>(IngredientType.class);
        for (IngredientType type : IngredientType.values()) {
            snapshot.put(type, getStock(type));
        }
        return snapshot;
    }

    public Map<IngredientType, Integer> getCapacities() {
        return new EnumMap<>(capacities);
    }

    public Map<IngredientType, Integer> getLowStockThresholds() {
        return new EnumMap<>(lowStockThresholds);
    }

    public List<IngredientType> getLowStockAlerts() {
        List<IngredientType> alerts = new ArrayList<>();
        for (IngredientType type : IngredientType.values()) {
            int current = getStock(type);
            int threshold = lowStockThresholds.getOrDefault(type, 50);
            if (current < threshold) {
                alerts.add(type);
            }
        }
        return alerts;
    }

    public boolean checkAvailability(Map<IngredientType, Integer> required) {
        if (required == null || required.isEmpty()) return true;
        for (Map.Entry<IngredientType, Integer> entry : required.entrySet()) {
            if (getStock(entry.getKey()) < entry.getValue()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Atomically validates and decrements all required ingredients across multiple hoppers.
     * Uses deterministic ascending enum ordinal lock ordering to prevent deadlocks when
     * concurrent orders request overlapping ingredient sets.
     */
    public boolean checkAndDeductIngredients(Map<IngredientType, Integer> required) {
        if (required == null || required.isEmpty()) {
            return true;
        }

        // 1. Sort required ingredients in deterministic natural order
        List<IngredientType> sortedKeys = new ArrayList<>(required.keySet());
        Collections.sort(sortedKeys);

        List<ReentrantLock> acquiredLocks = new ArrayList<>();
        try {
            // 2. Sequentially acquire locks in ascending order
            for (IngredientType type : sortedKeys) {
                ReentrantLock lock = ingredientLocks.get(type);
                lock.lock();
                acquiredLocks.add(lock);
            }

            // 3. Simultaneously verify all stocks
            List<String> missing = new ArrayList<>();
            for (Map.Entry<IngredientType, Integer> entry : required.entrySet()) {
                int available = inventory.get(entry.getKey()).get();
                if (available < entry.getValue()) {
                    missing.add(entry.getKey() + " (Needed: " + entry.getValue() + entry.getKey().getUnit()
                            + ", Available: " + available + entry.getKey().getUnit() + ")");
                }
            }

            if (!missing.isEmpty()) {
                throw new InsufficientIngredientException("Insufficient ingredients for brew: " + String.join("; ", missing));
            }

            // 4. Atomically deduct all quantities
            for (Map.Entry<IngredientType, Integer> entry : required.entrySet()) {
                inventory.get(entry.getKey()).addAndGet(-entry.getValue());
            }

            return true;
        } finally {
            // 5. Release locks in reverse order
            for (int i = acquiredLocks.size() - 1; i >= 0; i--) {
                acquiredLocks.get(i).unlock();
            }
        }
    }
}

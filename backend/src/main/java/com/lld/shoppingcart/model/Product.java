package com.lld.shoppingcart.model;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class Product {
    private final String id;
    private final String name;
    private final Category category;
    private final double price;
    private final AtomicInteger stockQuantity;
    private final ReentrantLock productLock = new ReentrantLock(true);

    public Product(String id, String name, Category category, double price, int initialStock) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stockQuantity = new AtomicInteger(initialStock);
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Category getCategory() {
        return category;
    }

    public double getPrice() {
        return price;
    }

    public int getStockQuantity() {
        return stockQuantity.get();
    }

    public boolean decrementStock(int quantity) {
        while (true) {
            int current = stockQuantity.get();
            if (current < quantity) {
                return false;
            }
            if (stockQuantity.compareAndSet(current, current - quantity)) {
                return true;
            }
        }
    }

    public void incrementStock(int quantity) {
        stockQuantity.addAndGet(quantity);
    }

    public ReentrantLock getLock() {
        return productLock;
    }
}
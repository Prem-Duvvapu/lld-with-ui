package com.lld.shoppingcart.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A catalog product. {@code stockQuantity} is the one field every concurrent checkout races on:
 * it is CAS-updated via {@link #decrementStock(int)}/{@link #incrementStock(int)} for a lock-free
 * fast path, and additionally covered end-to-end by {@link #productLock} — a fair, per-product
 * {@code ReentrantLock} — during {@code ShoppingCartService#placeOrder}, which locks every product
 * touched by an order in ascending product-id order (never cart-insertion order) so two orders that
 * share products in opposite orders can never deadlock.
 *
 * <p>Lombok {@code @Getter} only (not {@code @Data}/{@code @Builder}), matching
 * {@code com.lld.atm.model.Account}'s precedent: a mutable {@code ReentrantLock} field must never
 * end up in a generated {@code equals}/{@code hashCode}/{@code toString}, and the raw
 * {@code AtomicInteger} must never leak out of {@code getStockQuantity()} as JSON — both getters
 * are hand-written and excluded from Lombok via {@code @Getter(AccessLevel.NONE)}. The constructor
 * also does real work (seeding the {@code AtomicInteger} from a plain {@code int}), which a
 * generated all-args constructor could not express, so it stays hand-written too rather than
 * routing through a builder.
 */
@Getter
public class Product {
    private final String id;
    private final String name;
    private final Category category;
    private final double price;

    @Getter(AccessLevel.NONE)
    private final AtomicInteger stockQuantity;

    @Getter(AccessLevel.NONE)
    private final ReentrantLock productLock = new ReentrantLock(true);

    public Product(String id, String name, Category category, double price, int initialStock) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stockQuantity = new AtomicInteger(initialStock);
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

    @JsonIgnore
    public ReentrantLock getLock() {
        return productLock;
    }
}

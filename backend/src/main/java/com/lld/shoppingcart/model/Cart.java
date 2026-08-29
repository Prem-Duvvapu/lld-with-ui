package com.lld.shoppingcart.model;

import lombok.Getter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A user's live shopping cart. Lombok {@code @Getter} only (not {@code @Data}): {@code items} must
 * never get a generated setter (all mutation goes through {@link #addItem}/{@link #removeItem}/
 * {@link #updateQuantity} so {@link com.lld.shoppingcart.command.CartCommand} implementations stay
 * the single path for cart mutation), and the single-arg constructor is kept hand-written because
 * it doubles as the {@code Function<String, Cart>} passed to {@code Map#computeIfAbsent} in
 * {@code ShoppingCartService#getCart} (i.e. {@code Cart::new}).
 */
@Getter
public class Cart {
    private final String userId;
    private final Map<String, CartItem> items = new ConcurrentHashMap<>();

    public Cart(String userId) {
        this.userId = userId;
    }

    public void addItem(Product product, int quantity) {
        items.compute(product.getId(), (id, existing) -> {
            if (existing == null) {
                return new CartItem(product.getId(), product.getName(), product.getPrice(), quantity);
            } else {
                existing.setQuantity(existing.getQuantity() + quantity);
                return existing;
            }
        });
    }

    public void removeItem(String productId) {
        items.remove(productId);
    }

    public void updateQuantity(String productId, int quantity) {
        if (quantity <= 0) {
            items.remove(productId);
        } else {
            CartItem item = items.get(productId);
            if (item != null) {
                item.setQuantity(quantity);
            }
        }
    }

    public void clear() {
        items.clear();
    }

    public double getTotalAmount() {
        return items.values().stream().mapToDouble(CartItem::getTotalPrice).sum();
    }
}

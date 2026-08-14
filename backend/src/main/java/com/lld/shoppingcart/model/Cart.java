package com.lld.shoppingcart.model;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class Cart {
    private final String userId;
    private final Map<String, CartItem> items = new ConcurrentHashMap<>();

    public Cart(String userId) {
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }

    public Map<String, CartItem> getItems() {
        return items;
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
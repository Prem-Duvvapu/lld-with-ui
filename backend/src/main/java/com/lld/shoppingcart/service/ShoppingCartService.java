package com.lld.shoppingcart.service;

import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.repository.ShoppingCartRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ShoppingCartService {
    private final ShoppingCartRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public ShoppingCartService(ShoppingCartRepository repository) {
        this.repository = repository;
    }

    public List<Product> getProducts() {
        return repository.findAllProducts();
    }

    public Cart addToCart(long cartId, String userId, long productId, int quantity) {
        lock.lock();
        try {
            Product product = repository.findProductById(productId);
            if (product == null) {
                throw new IllegalArgumentException("Product not found");
            }
            if (product.getAvailableQuantity() < quantity) {
                throw new IllegalArgumentException("Insufficient stock");
            }

            Cart cart;
            if (cartId == 0) {
                cart = new Cart(repository.nextCartId(), userId);
            } else {
                cart = repository.findCartById(cartId);
                if (cart == null) {
                    throw new IllegalArgumentException("Cart not found");
                }
            }

            Map<Long, CartItem> items = cart.getItems();
            if (items.containsKey(productId)) {
                CartItem existing = items.get(productId);
                existing.setQuantity(existing.getQuantity() + quantity);
            } else {
                items.put(productId, new CartItem(productId, quantity, product.getPrice()));
            }

            cart.recalculateTotal();
            repository.saveCart(cart);
            return cart;
        } finally {
            lock.unlock();
        }
    }

    public Cart removeFromCart(long cartId, long productId) {
        lock.lock();
        try {
            Cart cart = repository.findCartById(cartId);
            if (cart == null) {
                throw new IllegalArgumentException("Cart not found");
            }
            cart.getItems().remove(productId);
            cart.recalculateTotal();
            repository.saveCart(cart);
            return cart;
        } finally {
            lock.unlock();
        }
    }

    public Cart updateQuantity(long cartId, long productId, int quantity) {
        lock.lock();
        try {
            Cart cart = repository.findCartById(cartId);
            if (cart == null) {
                throw new IllegalArgumentException("Cart not found");
            }
            if (quantity <= 0) {
                cart.getItems().remove(productId);
            } else {
                CartItem item = cart.getItems().get(productId);
                if (item == null) {
                    throw new IllegalArgumentException("Item not in cart");
                }
                item.setQuantity(quantity);
            }
            cart.recalculateTotal();
            repository.saveCart(cart);
            return cart;
        } finally {
            lock.unlock();
        }
    }

    public Cart getCart(long cartId) {
        Cart cart = repository.findCartById(cartId);
        if (cart == null) {
            throw new IllegalArgumentException("Cart not found");
        }
        return cart;
    }

    public Order checkout(long cartId, String shippingAddress) {
        lock.lock();
        try {
            Cart cart = repository.findCartById(cartId);
            if (cart == null) {
                throw new IllegalArgumentException("Cart not found");
            }
            if (cart.getItems().isEmpty()) {
                throw new IllegalArgumentException("Cart is empty");
            }

            List<CartItem> items = new ArrayList<>(cart.getItems().values());
            Order order = new Order(repository.nextOrderId(), cart.getUserId(), items, cart.getTotalAmount(), shippingAddress);

            cart.getItems().clear();
            cart.recalculateTotal();
            repository.saveCart(cart);
            return repository.saveOrder(order);
        } finally {
            lock.unlock();
        }
    }

    public Order updateOrderStatus(long orderId, String status) {
        lock.lock();
        try {
            Order order = repository.findOrderById(orderId);
            if (order == null) {
                throw new IllegalArgumentException("Order not found");
            }
            OrderStatus newStatus = OrderStatus.valueOf(status.toUpperCase());
            order.setStatus(newStatus);
            if (newStatus == OrderStatus.DELIVERED) {
                order.setDeliveryTime(LocalDateTime.now());
            }
            return repository.saveOrder(order);
        } finally {
            lock.unlock();
        }
    }

    public Order getOrder(long orderId) {
        Order order = repository.findOrderById(orderId);
        if (order == null) {
            throw new IllegalArgumentException("Order not found");
        }
        return order;
    }

    public List<Order> getOrders() {
        return repository.findAllOrders();
    }
}
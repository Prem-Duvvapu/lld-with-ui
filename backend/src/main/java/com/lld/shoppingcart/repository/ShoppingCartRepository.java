package com.lld.shoppingcart.repository;

import com.lld.shoppingcart.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

@Repository
public class ShoppingCartRepository {
    private final Map<Long, Product> products = new ConcurrentHashMap<>();
    private final Map<Long, Cart> carts = new ConcurrentHashMap<>();
    private final Map<Long, Order> orders = new ConcurrentHashMap<>();
    private final AtomicLong productIdGen = new AtomicLong(1);
    private final AtomicLong cartIdGen = new AtomicLong(1);
    private final AtomicLong orderIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public ShoppingCartRepository() {
        addProduct(new Product(productIdGen.getAndIncrement(), "Wireless Mouse", "Ergonomic wireless mouse with USB receiver", 799.0, "🖱️", "Electronics", 50));
        addProduct(new Product(productIdGen.getAndIncrement(), "Bluetooth Speaker", "Portable speaker with deep bass", 1999.0, "🔊", "Electronics", 30));
        addProduct(new Product(productIdGen.getAndIncrement(), "Cotton T-Shirt", "Premium cotton crew neck t-shirt", 599.0, "👕", "Clothing", 100));
        addProduct(new Product(productIdGen.getAndIncrement(), "Running Shoes", "Lightweight running shoes with cushioning", 3499.0, "👟", "Footwear", 25));
        addProduct(new Product(productIdGen.getAndIncrement(), "Backpack", "Water resistant 30L backpack", 1499.0, "🎒", "Accessories", 40));
        addProduct(new Product(productIdGen.getAndIncrement(), "Coffee Mug", "Ceramic mug 350ml", 349.0, "☕", "Kitchen", 80));
        addProduct(new Product(productIdGen.getAndIncrement(), "Notebook", "Hardcover ruled notebook A5", 249.0, "📓", "Stationery", 120));
        addProduct(new Product(productIdGen.getAndIncrement(), "Sunglasses", "UV protected polarized sunglasses", 1299.0, "🕶️", "Accessories", 35));
    }

    public void addProduct(Product product) { products.put(product.getId(), product); }

    public List<Product> findAllProducts() { return new ArrayList<>(products.values()); }

    public Product findProductById(long id) { return products.get(id); }

    public Cart saveCart(Cart cart) {
        lock.lock();
        try {
            carts.put(cart.getId(), cart);
            return cart;
        } finally {
            lock.unlock();
        }
    }

    public Cart findCartById(long id) { return carts.get(id); }

    public Order saveOrder(Order order) {
        lock.lock();
        try {
            orders.put(order.getId(), order);
            return order;
        } finally {
            lock.unlock();
        }
    }

    public Order findOrderById(long id) { return orders.get(id); }
    public List<Order> findAllOrders() { return new ArrayList<>(orders.values()); }

    public long nextCartId() { return cartIdGen.getAndIncrement(); }
    public long nextOrderId() { return orderIdGen.getAndIncrement(); }
}
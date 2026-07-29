package com.lld.vendingmachine.repository;

import com.lld.vendingmachine.model.Product;
import com.lld.vendingmachine.model.Slot;
import com.lld.vendingmachine.model.Transaction;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class VendingRepository {
    private final Map<Long, Product> products = new ConcurrentHashMap<>();
    private final Map<Long, Slot> slots = new ConcurrentHashMap<>();
    private final Map<Long, Transaction> transactions = new ConcurrentHashMap<>();
    private final AtomicLong productIdGen = new AtomicLong(1);
    private final AtomicLong slotIdGen = new AtomicLong(1);
    private final AtomicLong transactionIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public VendingRepository() {
        seedData();
    }

    private void seedData() {
        addProduct(new Product(productIdGen.getAndIncrement(), "Coke", 25.0, 10, "Beverage"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Pepsi", 25.0, 10, "Beverage"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Water", 20.0, 15, "Beverage"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Chips", 15.0, 12, "Snack"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Chocolate", 30.0, 8, "Snack"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Cookie", 20.0, 10, "Snack"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Juice", 35.0, 8, "Beverage"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Sandwich", 50.0, 5, "Food"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Candy", 10.0, 20, "Snack"));
        addProduct(new Product(productIdGen.getAndIncrement(), "Energy Drink", 40.0, 6, "Beverage"));

        List<Long> productIds = new ArrayList<>(products.keySet());
        for (int i = 0; i < productIds.size(); i++) {
            Product p = products.get(productIds.get(i));
            int row = i / 4;
            int col = i % 4;
            addSlot(new Slot(slotIdGen.getAndIncrement(), p.getId(), row, col, 5, Math.min(p.getQuantity(), 5)));
        }
    }

    private void addProduct(Product product) {
        products.put(product.getId(), product);
    }

    private void addSlot(Slot slot) {
        slots.put(slot.getId(), slot);
    }

    public List<Product> getAllProducts() {
        return new ArrayList<>(products.values());
    }

    public Product getProduct(long id) {
        return products.get(id);
    }

    public List<Slot> getAllSlots() {
        return new ArrayList<>(slots.values());
    }

    public Slot getSlot(long id) {
        return slots.get(id);
    }

    public Slot findSlotByProductId(long productId) {
        return slots.values().stream()
                .filter(s -> s.getProductId() == productId)
                .findFirst().orElse(null);
    }

    public void updateProduct(Product product) {
        products.put(product.getId(), product);
    }

    public void updateSlot(Slot slot) {
        slots.put(slot.getId(), slot);
    }

    public long nextTransactionId() {
        return transactionIdGen.getAndIncrement();
    }

    public void saveTransaction(Transaction transaction) {
        transactions.put(transaction.getId(), transaction);
    }

    public Transaction getTransaction(long id) {
        return transactions.get(id);
    }

    public List<Product> getAllProductsSorted() {
        return products.values().stream()
                .sorted(Comparator.comparingLong(Product::getId))
                .collect(Collectors.toList());
    }

    public ReentrantLock getLock() { return lock; }
}

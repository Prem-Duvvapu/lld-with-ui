package com.lld.inventory.repository;

import com.lld.inventory.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class InventoryRepository {
    private final Map<Long, Product> products = new ConcurrentHashMap<>();
    private final Map<Long, Supplier> suppliers = new ConcurrentHashMap<>();
    private final Map<Long, List<StockMovement>> movements = new ConcurrentHashMap<>();
    private final AtomicLong productIdGen = new AtomicLong(1);
    private final AtomicLong movementIdGen = new AtomicLong(1);
    private final AtomicLong supplierIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public InventoryRepository() {
        Supplier s1 = new Supplier(supplierIdGen.getAndIncrement(), "TechDistributors", "contact@techdist.com", "555-0100");
        Supplier s2 = new Supplier(supplierIdGen.getAndIncrement(), "FashionWholesale", "info@fashionws.com", "555-0200");
        Supplier s3 = new Supplier(supplierIdGen.getAndIncrement(), "MedSupply Co", "orders@medsupply.com", "555-0300");
        suppliers.put(s1.getId(), s1);
        suppliers.put(s2.getId(), s2);
        suppliers.put(s3.getId(), s3);

        addProduct(new Product(productIdGen.getAndIncrement(), "ELEC-001", "Wireless Mouse", Category.ELECTRONICS, 799.0, 45, 10, s1.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "ELEC-002", "USB-C Hub", Category.ELECTRONICS, 1299.0, 12, 10, s1.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "CLTH-001", "Cotton T-Shirt", Category.CLOTHING, 599.0, 80, 20, s2.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "CLTH-002", "Denim Jacket", Category.CLOTHING, 2499.0, 5, 10, s2.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "FOOD-001", "Green Tea Box", Category.FOOD, 349.0, 30, 15, s2.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "MED-001", "First Aid Kit", Category.MEDICINE, 499.0, 8, 10, s3.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "STN-001", "Notebook Pack", Category.STATIONERY, 249.0, 60, 20, s2.getId()));
        addProduct(new Product(productIdGen.getAndIncrement(), "ELEC-003", "Bluetooth Speaker", Category.ELECTRONICS, 1999.0, 3, 5, s1.getId()));
    }

    public void addProduct(Product product) {
        lock.lock();
        try {
            products.put(product.getId(), product);
        } finally {
            lock.unlock();
        }
    }

    public Product saveProduct(Product product) {
        lock.lock();
        try {
            products.put(product.getId(), product);
            return product;
        } finally {
            lock.unlock();
        }
    }

    public Product findProductById(long id) {
        return products.get(id);
    }

    public List<Product> findAllProducts() {
        return new ArrayList<>(products.values());
    }

    public List<Product> findProductsByCategory(Category category) {
        return products.values().stream()
                .filter(p -> p.getCategory() == category)
                .collect(Collectors.toList());
    }

    public Supplier findSupplierById(long id) {
        return suppliers.get(id);
    }

    public List<Supplier> findAllSuppliers() {
        return new ArrayList<>(suppliers.values());
    }

    public void addMovement(StockMovement movement) {
        lock.lock();
        try {
            movements.computeIfAbsent(movement.getProductId(), k -> new ArrayList<>()).add(movement);
        } finally {
            lock.unlock();
        }
    }

    public List<StockMovement> findMovementsByProductId(long productId) {
        List<StockMovement> list = movements.get(productId);
        return list != null ? new ArrayList<>(list) : new ArrayList<>();
    }

    public long nextProductId() { return productIdGen.getAndIncrement(); }
    public long nextMovementId() { return movementIdGen.getAndIncrement(); }
}
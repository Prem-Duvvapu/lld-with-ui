package com.lld.inventory.service;

import com.lld.inventory.model.*;
import com.lld.inventory.model.StockMovement.StockMovementType;
import com.lld.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class InventoryService {
    private final InventoryRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public InventoryService(InventoryRepository repository) {
        this.repository = repository;
    }

    public Product addProduct(Product product) {
        lock.lock();
        try {
            product.setId(repository.nextProductId());
            repository.addProduct(product);
            return product;
        } finally {
            lock.unlock();
        }
    }

    public List<Product> getProducts(String category) {
        if (category != null && !category.isEmpty()) {
            try {
                Category cat = Category.valueOf(category.toUpperCase());
                return repository.findProductsByCategory(cat);
            } catch (IllegalArgumentException e) {
                return repository.findAllProducts();
            }
        }
        return repository.findAllProducts();
    }

    public StockMovement updateStock(long productId, int quantity, String type, String reason) {
        lock.lock();
        try {
            Product product = repository.findProductById(productId);
            if (product == null) {
                throw new IllegalArgumentException("Product not found");
            }
            StockMovementType movementType = StockMovementType.valueOf(type.toUpperCase());
            int changeQuantity = movementType == StockMovementType.OUTBOUND ? -quantity : quantity;

            if (product.getCurrentStock() + changeQuantity < 0) {
                throw new IllegalArgumentException("Insufficient stock");
            }

            product.setCurrentStock(product.getCurrentStock() + changeQuantity);
            repository.saveProduct(product);

            StockMovement movement = new StockMovement(
                repository.nextMovementId(), productId, movementType, quantity,
                LocalDateTime.now(), reason, "MOV-" + System.currentTimeMillis()
            );
            repository.addMovement(movement);
            return movement;
        } finally {
            lock.unlock();
        }
    }

    public List<Product> getLowStockItems(int threshold) {
        return repository.findAllProducts().stream()
                .filter(p -> p.getCurrentStock() <= threshold)
                .collect(Collectors.toList());
    }

    public StockMovement transferStock(long productId, String fromLocation, String toLocation, int quantity) {
        lock.lock();
        try {
            Product product = repository.findProductById(productId);
            if (product == null) {
                throw new IllegalArgumentException("Product not found");
            }
            if (product.getCurrentStock() < quantity) {
                throw new IllegalArgumentException("Insufficient stock for transfer");
            }
            product.setCurrentStock(product.getCurrentStock() - quantity);
            repository.saveProduct(product);

            StockMovement movement = new StockMovement(
                repository.nextMovementId(), productId, StockMovementType.TRANSFER, quantity,
                LocalDateTime.now(), "Transfer from " + fromLocation + " to " + toLocation,
                "TRF-" + System.currentTimeMillis()
            );
            repository.addMovement(movement);
            return movement;
        } finally {
            lock.unlock();
        }
    }

    public List<StockMovement> getStockMovements(long productId) {
        return repository.findMovementsByProductId(productId);
    }

    public List<Supplier> getSuppliers() {
        return repository.findAllSuppliers();
    }
}
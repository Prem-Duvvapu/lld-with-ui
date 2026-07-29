package com.lld.vendingmachine.service;

import com.lld.vendingmachine.model.*;
import com.lld.vendingmachine.repository.VendingRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class VendingMachineService {
    private final VendingRepository repository;
    private VendingState state = VendingState.IDLE;
    private final ReentrantLock lock = new ReentrantLock();

    public VendingMachineService(VendingRepository repository) {
        this.repository = repository;
    }

    public List<Map<String, Object>> getProducts() {
        List<Product> products = repository.getAllProductsSorted();
        List<Slot> slots = repository.getAllSlots();
        Map<Long, Slot> slotByProduct = new HashMap<>();
        for (Slot s : slots) slotByProduct.put(s.getProductId(), s);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Product p : products) {
            Slot slot = slotByProduct.get(p.getId());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", p.getId());
            item.put("name", p.getName());
            item.put("price", p.getPrice());
            item.put("quantity", p.getQuantity());
            item.put("category", p.getCategory());
            item.put("slotRow", slot != null ? slot.getRow() : 0);
            item.put("slotCol", slot != null ? slot.getCol() : 0);
            item.put("stock", slot != null ? slot.getCurrentStock() : 0);
            result.add(item);
        }
        return result;
    }

    public Transaction selectProduct(long productId, int quantity) {
        lock.lock();
        try {
            Product product = repository.getProduct(productId);
            if (product == null) throw new IllegalArgumentException("Product not found");
            if (product.getQuantity() < quantity)
                throw new IllegalStateException("Insufficient stock");

            Slot slot = repository.findSlotByProductId(productId);
            if (slot == null || slot.getCurrentStock() < quantity)
                throw new IllegalStateException("Insufficient stock in slot");

            double total = product.getPrice() * quantity;
            Transaction txn = new Transaction(
                repository.nextTransactionId(),
                Collections.singletonList(productId),
                Collections.singletonList(quantity),
                total
            );
            repository.saveTransaction(txn);
            state = VendingState.SELECTING;
            return txn;
        } finally {
            lock.unlock();
        }
    }

    public Transaction insertCoin(long transactionId, double amount) {
        lock.lock();
        try {
            Transaction txn = repository.getTransaction(transactionId);
            if (txn == null) throw new IllegalArgumentException("Transaction not found");
            if (!"PENDING".equals(txn.getStatus()))
                throw new IllegalStateException("Transaction already " + txn.getStatus());

            txn.setInsertedAmount(txn.getInsertedAmount() + amount);

            if (txn.getInsertedAmount() >= txn.getTotalAmount()) {
                txn.setStatus("PAID");
                state = VendingState.DISPENSING;
            }
            return txn;
        } finally {
            lock.unlock();
        }
    }

    public Transaction dispense(long transactionId) {
        lock.lock();
        try {
            Transaction txn = repository.getTransaction(transactionId);
            if (txn == null) throw new IllegalArgumentException("Transaction not found");
            if (!"PAID".equals(txn.getStatus()))
                throw new IllegalStateException("Payment not completed");

            for (int i = 0; i < txn.getSelectedProductIds().size(); i++) {
                long productId = txn.getSelectedProductIds().get(i);
                int qty = txn.getQuantities().get(i);
                Product product = repository.getProduct(productId);
                Slot slot = repository.findSlotByProductId(productId);

                product.setQuantity(product.getQuantity() - qty);
                if (slot != null) {
                    slot.setCurrentStock(slot.getCurrentStock() - qty);
                    repository.updateSlot(slot);
                }
                repository.updateProduct(product);
            }

            double change = txn.getInsertedAmount() - txn.getTotalAmount();
            txn.setChange(Math.round(change * 100.0) / 100.0);
            txn.setStatus("COMPLETED");
            state = VendingState.COMPLETE;
            return txn;
        } finally {
            lock.unlock();
        }
    }

    public Transaction cancelTransaction(long transactionId) {
        lock.lock();
        try {
            Transaction txn = repository.getTransaction(transactionId);
            if (txn == null) throw new IllegalArgumentException("Transaction not found");
            if ("COMPLETED".equals(txn.getStatus()))
                throw new IllegalStateException("Cannot cancel completed transaction");

            txn.setStatus("CANCELLED");
            state = VendingState.IDLE;
            return txn;
        } finally {
            lock.unlock();
        }
    }

    public VendingState getState() { return state; }
    public void setState(VendingState state) { this.state = state; }
}

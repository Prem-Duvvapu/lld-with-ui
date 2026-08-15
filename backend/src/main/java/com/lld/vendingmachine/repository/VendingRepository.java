package com.lld.vendingmachine.repository;

import com.lld.vendingmachine.model.Product;
import com.lld.vendingmachine.model.Slot;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class VendingRepository {
    private final Map<String, Product> products = new ConcurrentHashMap<>();
    private final Map<String, Slot> slots = new ConcurrentHashMap<>();

    public void saveProduct(Product product) {
        products.put(product.getCode(), product);
    }

    public Product findProductByCode(String code) {
        return products.get(code);
    }

    public List<Product> findAllProducts() {
        return List.copyOf(products.values());
    }

    public void saveSlot(Slot slot) {
        slots.put(slot.getCode(), slot);
    }

    public Slot findSlotByCode(String code) {
        return slots.get(code);
    }

    public List<Slot> findAllSlots() {
        return List.copyOf(slots.values());
    }
}

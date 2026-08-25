package com.lld.vendingmachine.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Slot {
    private long id;
    private String code;
    private int row;
    private int col;
    private Product product;
    private int capacity;
    private int currentStock;

    public boolean isAvailable() {
        return currentStock > 0 && product != null;
    }

    public void decrementStock() {
        if (currentStock > 0) {
            currentStock--;
        }
    }

    public void restock(int amount) {
        this.currentStock = Math.min(this.capacity, this.currentStock + amount);
    }
}

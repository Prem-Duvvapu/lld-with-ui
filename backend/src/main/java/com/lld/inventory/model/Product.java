package com.lld.inventory.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    private long id;
    private String sku;
    private String name;
    private Category category;
    private double unitPrice;
    private int currentStock;
    private int reorderLevel;
    private long supplierId;

    /** True when stock has fallen to or below the product's own reorder level. */
    public boolean isAtOrBelowReorderLevel() {
        return currentStock <= reorderLevel;
    }
}

package com.lld.inventory.strategy;

import com.lld.inventory.model.Product;

/**
 * One reorder algorithm. The service calls only this interface — it never
 * branches on {@link ReorderPolicy} itself, so adding a policy is one new
 * implementation plus one factory entry.
 */
public interface ReorderStrategy {

    /** Human-readable name surfaced in the UI and audit events. */
    String name();

    /**
     * Units to order for the product right now. Implementations return a
     * positive quantity or throw {@code InvalidStockOperationException} when
     * the policy is not applicable (e.g. stock already above the reorder
     * level).
     */
    int reorderQuantity(Product product);
}

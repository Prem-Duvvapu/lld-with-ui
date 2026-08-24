package com.lld.inventory.strategy;

import com.lld.inventory.model.Product;
import org.springframework.stereotype.Component;

/**
 * Stock-out response: a stock-out (zero on hand) triggers a large buffer of
 * 5&times; the reorder level; anything else low gets a 3&times; top-up. Always
 * returns at least one unit.
 */
@Component
public class UrgentBufferReorderStrategy implements ReorderStrategy {

    private static final int STOCKOUT_TARGET_MULTIPLE = 5;
    private static final int LOW_TARGET_MULTIPLE = 3;

    @Override
    public String name() {
        return "UrgentBuffer";
    }

    @Override
    public int reorderQuantity(Product product) {
        int multiple = product.getCurrentStock() <= 0 ? STOCKOUT_TARGET_MULTIPLE : LOW_TARGET_MULTIPLE;
        int target = product.getReorderLevel() * multiple;
        return Math.max(target - product.getCurrentStock(), 1);
    }
}

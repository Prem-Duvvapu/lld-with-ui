package com.lld.inventory.strategy;

import com.lld.inventory.exception.InvalidStockOperationException;
import com.lld.inventory.model.Product;
import org.springframework.stereotype.Component;

/** Orders the bare minimum: exactly enough to climb back to the reorder level. */
@Component
public class MinRestockStrategy implements ReorderStrategy {

    @Override
    public String name() {
        return "MinRestock";
    }

    @Override
    public int reorderQuantity(Product product) {
        int needed = product.getReorderLevel() - product.getCurrentStock();
        if (needed <= 0) {
            throw new InvalidStockOperationException(
                    "MinRestock not applicable to " + product.getSku()
                            + " — stock " + product.getCurrentStock() + " already above reorder level "
                            + product.getReorderLevel());
        }
        return needed;
    }
}

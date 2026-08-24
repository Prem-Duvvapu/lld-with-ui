package com.lld.inventory.strategy;

import com.lld.inventory.model.Product;
import org.springframework.stereotype.Component;

/**
 * Classic Harris EOQ lot size: Q* = &radic;(2DS/H), rounded up.
 *
 * <p>D (annual demand) is estimated per SKU from the reorder level — the seed
 * catalogue turns its stock roughly 26 times a year, so D = 26 &times; reorder
 * level. S (fixed cost per order) and the holding rate are constants of this
 * policy; H = holdingRate &times; unitPrice. Deterministic for a given product,
 * which is what the unit test pins.
 */
@Component
public class EoqReorderStrategy implements ReorderStrategy {

    static final int DEMAND_TURNS_PER_YEAR = 26;
    static final double ORDERING_COST = 500.0;
    static final double HOLDING_RATE = 0.10;

    @Override
    public String name() {
        return "EOQ";
    }

    @Override
    public int reorderQuantity(Product product) {
        if (product.getUnitPrice() <= 0) {
            return Math.max(product.getReorderLevel(), 1);
        }
        double annualDemand = DEMAND_TURNS_PER_YEAR * product.getReorderLevel();
        double holdingCostPerUnit = HOLDING_RATE * product.getUnitPrice();
        double eoq = Math.sqrt((2 * annualDemand * ORDERING_COST) / holdingCostPerUnit);
        return (int) Math.ceil(eoq);
    }
}

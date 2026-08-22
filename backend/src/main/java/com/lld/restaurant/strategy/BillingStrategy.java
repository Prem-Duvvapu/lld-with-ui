package com.lld.restaurant.strategy;

public interface BillingStrategy {
    String getName();
    BillBreakdown compute(double subtotal);
}

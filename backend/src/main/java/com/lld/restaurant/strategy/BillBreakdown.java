package com.lld.restaurant.strategy;

public record BillBreakdown(
        double subtotal,
        double discount,
        double tax,
        double serviceCharge,
        double total
) {}

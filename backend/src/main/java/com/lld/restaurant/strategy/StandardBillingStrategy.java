package com.lld.restaurant.strategy;

public class StandardBillingStrategy implements BillingStrategy {

    @Override
    public String getName() {
        return "STANDARD";
    }

    @Override
    public BillBreakdown compute(double subtotal) {
        double sub = round(subtotal);
        double discount = 0.00;
        double taxable = round(sub - discount);
        double tax = round(taxable * 0.05);
        double serviceCharge = round(taxable * 0.10);
        double total = round(taxable + tax + serviceCharge);
        return new BillBreakdown(sub, discount, tax, serviceCharge, total);
    }

    private static double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}

package com.lld.restaurant.strategy;

public class HappyHourBillingStrategy implements BillingStrategy {

    @Override
    public String getName() {
        return "HAPPY_HOUR_20%";
    }

    @Override
    public BillBreakdown compute(double subtotal) {
        double sub = round(subtotal);
        double discount = round(sub * 0.20);
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

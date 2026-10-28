package com.lld.learning.examples.dry;

public final class DryDemo {
    public static void main(String[] args) {
        int subtotal = 5500;
        System.out.println("original: preview=" + BeforeQuotes.originalPreview(subtotal)
                + ", checkout=" + BeforeQuotes.originalCheckout(subtotal));
        System.out.println("partial change: preview=" + BeforeQuotes.updatedPreview(subtotal)
                + ", checkout=" + BeforeQuotes.staleCheckout(subtotal));

        DeliveryFeeRule rule = new DeliveryFeeRule(6000, 500);
        OrderQuotes live = new OrderQuotes(rule);
        OrderQuotes sandbox = new OrderQuotes(rule);
        System.out.println("shared rule: preview=" + live.preview(subtotal)
                + ", checkout=" + live.checkoutQuote("A", subtotal));
        System.out.println("before sandbox quote: live=" + live.recordedCount()
                + ", sandbox=" + sandbox.recordedCount());
        sandbox.checkoutQuote("A", 6000);
        System.out.println("independent records: live A=" + live.recordedFee("A")
                + ", sandbox A=" + sandbox.recordedFee("A"));

        OrderQuotes next = new OrderQuotes(new DeliveryFeeRule(7000, 500));
        System.out.println("next delivery rule: fee at 6000=" + next.preview(6000));
        System.out.println("separate reward rule: redeem at 6000=" + RewardRule.canRedeem(6000));
    }
}

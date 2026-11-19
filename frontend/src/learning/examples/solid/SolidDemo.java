package com.lld.learning.examples.solid;

import com.lld.learning.examples.solid.CounterExamples.*;

public final class SolidDemo {
    private SolidDemo() {}

    private static QuoteService service(FeePolicy policy) {
        return new QuoteService(policy, new ReceiptFormatter());
    }

    public static void main(String[] args) {
        FeePolicy standard = new StandardFee();
        FeePolicy pickup = new PickupFee(standard);
        FeePolicy free = new FreeFee();
        System.out.println("SRP before: " + new CoupledCounter().receipt(1000));
        System.out.println("SRP after: " + service(standard).receipt(1000));
        System.out.println("OCP standard=" + service(standard).quoteCents(1000)
                + " pickup=" + service(pickup).quoteCents(1000) + " free=" + service(free).quoteCents(1000));
        System.out.println("LSP valid 1g: standard=" + standard.feeCents(1)
                + " pickup=" + pickup.feeCents(1) + " free=" + free.feeCents(1));
        try {
            new BulkyOnlyFee().feeCents(1);
        } catch (IllegalArgumentException failure) {
            System.out.println("LSP broken 1g: " + failure.getClass().getSimpleName() + ": " + failure.getMessage());
        }
        OnlineStation legacy = new OnlineStation();
        try {
            legacy.printReceipt(1000);
        } catch (UnsupportedOperationException failure) {
            System.out.println("ISP legacy quote=" + legacy.quoteCents(1000) + " print="
                    + failure.getClass().getSimpleName() + ": " + failure.getMessage());
        }
        System.out.println("ISP segregated quote=" + new OnlineQuote().quoteCents(1000)
                + " print=" + new DeskPrinter(service(standard)).printReceipt(1000));
        System.out.println("DIP standard=" + service(standard).quoteCents(1001)
                + " pickup=" + service(pickup).quoteCents(1001) + " free=" + service(free).quoteCents(1001));
    }
}

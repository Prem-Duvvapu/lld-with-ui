package com.lld.learning.examples.dependency;

public final class DependencyDemo {
    public static void main(String[] args) {
        QuoteService service = new QuoteService();
        FeePolicy flat = new FlatFeePolicy(50);
        FeePolicy threshold = new FreeAbovePolicy(1000, 50);

        System.out.println("parameter / flat: " + service.quote(1200, flat));
        System.out.println("parameter / threshold: " + service.quote(1200, threshold));
        System.out.println("threshold / below boundary: " + service.quote(999, threshold));
        System.out.println("local / default: " + service.quoteWithDefault(1200));

        QuoteSession session = new QuoteSession(flat);
        FeePolicy saved = session.getPolicy();
        flat = threshold; // Rebinding the local variable does not change the session field.
        System.out.println("rebound local: " + service.quote(1200, flat));
        System.out.println("stored session: " + session.quote(1200));
        System.out.println("session policy == saved: " + (session.getPolicy() == saved));
        System.out.println("local == saved: " + (flat == saved));

        FeePolicy broken = subtotal -> -1; // Compiles, but violates the written contract.
        try {
            service.quote(1200, broken);
        } catch (IllegalArgumentException failure) {
            System.out.println("rejected: " + failure.getMessage());
        }
        System.out.println("saved policy still usable: " + saved.feeCents(1200));
    }
}

package com.lld.learning.examples.dry;

/** Historical versions kept side by side to demonstrate a partial rule change. */
public final class BeforeQuotes {
    private BeforeQuotes() { }

    public static int originalPreview(int subtotalCents) {
        requireSubtotal(subtotalCents);
        return subtotalCents >= 5000 ? 0 : 500;
    }

    public static int originalCheckout(int subtotalCents) {
        requireSubtotal(subtotalCents);
        return subtotalCents >= 5000 ? 0 : 500;
    }

    // Requirement changed: free delivery now starts at 6000 cents.
    public static int updatedPreview(int subtotalCents) {
        requireSubtotal(subtotalCents);
        return subtotalCents >= 6000 ? 0 : 500;
    }

    // Bug: this copy still encodes the OLD requirement.
    public static int staleCheckout(int subtotalCents) {
        requireSubtotal(subtotalCents);
        return subtotalCents >= 5000 ? 0 : 500;
    }

    private static void requireSubtotal(int subtotalCents) {
        if (subtotalCents < 0) throw new IllegalArgumentException("Negative subtotal");
    }
}

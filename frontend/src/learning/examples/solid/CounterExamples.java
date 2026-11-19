package com.lld.learning.examples.solid;

import java.util.Objects;

/** Small, side-by-side teaching alternatives. None books, prints physically or charges money. */
public final class CounterExamples {
    private CounterExamples() {}

    // Before SRP: fee rules and receipt wording change in the same class.
    public static final class CoupledCounter {
        public String receipt(int weightGrams) {
            StandardFee.requireWeight(weightGrams);
            int cents = weightGrams <= 1000 ? 300 : 500;
            return "Parcel " + weightGrams + "g: " + cents + "c";
        }
    }

    public static final class ReceiptFormatter {
        public String format(int weightGrams, int feeCents) {
            StandardFee.requireWeight(weightGrams);
            if (feeCents < 0 || feeCents > 2000) {
                throw new IllegalArgumentException("feeCents must be 0..2000");
            }
            return "Parcel " + weightGrams + "g: " + feeCents + "c";
        }
    }

    // After SRP and DIP: this client owns orchestration and depends on its fee contract.
    public static final class QuoteService implements QuoteReader {
        private final FeePolicy policy;
        private final ReceiptFormatter formatter;

        public QuoteService(FeePolicy policy, ReceiptFormatter formatter) {
            this.policy = Objects.requireNonNull(policy, "policy");
            this.formatter = Objects.requireNonNull(formatter, "formatter");
        }

        @Override public int quoteCents(int weightGrams) {
            return policy.feeCents(weightGrams);
        }

        public String receipt(int weightGrams) {
            return formatter.format(weightGrams, quoteCents(weightGrams));
        }
    }

    // Before OCP: each new named option changes this dispatch method.
    public static final class SwitchCounter {
        public int quoteCents(String mode, int weightGrams) {
            StandardFee.requireWeight(weightGrams);
            if ("STANDARD".equals(mode)) return new StandardFee().feeCents(weightGrams);
            if ("PICKUP".equals(mode)) return new PickupFee(new StandardFee()).feeCents(weightGrams);
            throw new IllegalArgumentException("Unknown mode");
        }
    }

    // Before ISP: online quoting is forced to advertise an unsupported printer operation.
    public interface AllInOneStation {
        int quoteCents(int weightGrams);
        String printReceipt(int weightGrams);
    }

    public static final class OnlineStation implements AllInOneStation {
        @Override public int quoteCents(int weightGrams) {
            return new StandardFee().feeCents(weightGrams);
        }

        @Override public String printReceipt(int weightGrams) {
            throw new UnsupportedOperationException("Online station cannot print");
        }
    }

    public interface QuoteReader { int quoteCents(int weightGrams); }
    public interface ReceiptPrinter { String printReceipt(int weightGrams); }

    // After ISP: quote-only clients have no printer dependency at all.
    public static final class OnlineQuote implements QuoteReader {
        @Override public int quoteCents(int weightGrams) {
            return new StandardFee().feeCents(weightGrams);
        }
    }

    public static final class DeskPrinter implements ReceiptPrinter {
        private final QuoteService counter;
        public DeskPrinter(QuoteService counter) {
            this.counter = Objects.requireNonNull(counter, "counter");
        }
        @Override public String printReceipt(int weightGrams) { return counter.receipt(weightGrams); }
    }

    // Before DIP: business workflow constructs its own concrete fee detail.
    public static final class DirectCounter {
        private final StandardFee policy = new StandardFee();
        public int quoteCents(int weightGrams) { return policy.feeCents(weightGrams); }
    }
}

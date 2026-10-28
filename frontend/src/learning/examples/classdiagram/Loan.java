package com.lld.learning.examples.classdiagram;

import java.util.Objects;

// This structural example does not enforce exclusive lending of a book.
public final class Loan {
    private final Book book;
    private Receipt receipt;
    private boolean closed;

    public Loan(Book book) {
        this.book = Objects.requireNonNull(book, "Book is required");
    }

    public Book book() { return book; }
    public Receipt receipt() { return receipt; }
    public boolean isClosed() { return closed; }

    public Receipt issueReceipt() {
        if (closed) throw new IllegalStateException("Loan is closed");
        if (receipt == null) receipt = new Receipt(this, book.label());
        return receipt;
    }

    public void close() {
        closed = true;
        if (receipt != null) receipt.retire();
    }

    public static final class Receipt {
        private final Loan owner;
        private String text;
        private boolean active = true;

        private Receipt(Loan owner, String text) {
            this.owner = owner;
            this.text = text;
        }

        public boolean isFor(Loan loan) { return owner == loan; }
        public boolean isActive() { return active; }
        public String read() {
            if (!active) throw new IllegalStateException("Receipt is retired");
            return text;
        }

        private void retire() {
            active = false;
            text = "";
        }
    }
}

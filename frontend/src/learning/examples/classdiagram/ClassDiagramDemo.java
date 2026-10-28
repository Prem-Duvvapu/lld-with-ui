package com.lld.learning.examples.classdiagram;

public final class ClassDiagramDemo {
    public static void main(String[] args) {
        Book book = new Book("UML");
        Shelf first = new Shelf();
        Shelf second = new Shelf();
        Loan loan = new Loan(book);
        System.out.println("initial: books=" + first.books().size() + ", receipt=" + loan.receipt());

        first.add(book);
        first.add(book);
        second.add(book);
        System.out.println("shared: same book=" + (first.books().get(0) == second.books().get(0)));
        System.out.println("preview: " + first.preview(book));

        Loan.Receipt saved = loan.issueReceipt();
        System.out.println("receipt: " + saved.read() + ", same receipt=" + (saved == loan.issueReceipt()));
        System.out.println("owner matches=" + saved.isFor(loan));
        first.clear();
        System.out.println("after clear: first=" + first.books().size() + ", second=" + second.books().size()
                + ", loan keeps book=" + (loan.book() == book));

        loan.close();
        System.out.println("closed=" + loan.isClosed() + ", receipt active=" + saved.isActive());
        try {
            saved.read();
        } catch (IllegalStateException expected) {
            System.out.println("read rejected: " + expected.getMessage());
        }
        System.out.println("book remains: " + book.label());
    }
}

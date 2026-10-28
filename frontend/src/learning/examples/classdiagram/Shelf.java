package com.lld.learning.examples.classdiagram;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

// Shared grouping: clearing membership never retires a book.
public final class Shelf {
    private final List<Book> books = new ArrayList<>();

    public void add(Book book) {
        Objects.requireNonNull(book, "Book is required");
        if (!books.contains(book)) books.add(book);
    }

    public List<Book> books() { return List.copyOf(books); }
    public void clear() { books.clear(); }

    // Preview any label; this parameter is not stored in the shelf.
    public String preview(Labelled item) {
        return Objects.requireNonNull(item, "Labelled item is required").label();
    }
}

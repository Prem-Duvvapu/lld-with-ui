package com.lld.library.model;

import lombok.Getter;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Getter
public class Book {
    private final String isbn;
    private final String title;
    private final String author;
    private final String category;
    private final List<BookCopy> copies = new CopyOnWriteArrayList<>();

    public Book(String isbn, String title, String author, String category) {
        if (isbn == null || isbn.trim().isEmpty()) {
            throw new IllegalArgumentException("ISBN cannot be null or empty");
        }
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be null or empty");
        }
        if (author == null || author.trim().isEmpty()) {
            throw new IllegalArgumentException("Author cannot be null or empty");
        }
        this.isbn = isbn.trim();
        this.title = title.trim();
        this.author = author.trim();
        this.category = category != null ? category.trim() : "General";
    }

    /** Exposed read-only — callers add copies via {@link #addCopy}, never the backing list directly. */
    public List<BookCopy> getCopies() {
        return Collections.unmodifiableList(copies);
    }

    public void addCopy(BookCopy copy) {
        if (copy != null) {
            copies.add(copy);
        }
    }

    public int getTotalCopies() {
        return copies.size();
    }

    public int getAvailableCopiesCount() {
        return (int) copies.stream().filter(BookCopy::isAvailable).count();
    }

    public BookCopy findAvailableCopy() {
        return copies.stream().filter(BookCopy::isAvailable).findFirst().orElse(null);
    }
}

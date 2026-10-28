package com.lld.learning.examples.classdiagram;

public final class Book extends Resource implements Labelled {
    public Book(String title) { super(title); }

    @Override
    public String label() { return "Book: " + title(); }
}

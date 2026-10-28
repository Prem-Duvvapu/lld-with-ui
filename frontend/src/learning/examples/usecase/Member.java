package com.lld.learning.examples.usecase;

import java.util.Objects;

/** Role data is supplied by the caller; this example does not authenticate people. */
public final class Member {
    private final String id;
    private final boolean active;
    private final boolean librarian;

    public Member(String id, boolean active, boolean librarian) {
        this.id = Objects.requireNonNull(id, "member id").strip();
        if (this.id.isEmpty()) throw new IllegalArgumentException("Blank member id");
        this.active = active;
        this.librarian = librarian;
    }

    public String id() { return id; }
    public boolean active() { return active; }
    public boolean librarian() { return librarian; }
}

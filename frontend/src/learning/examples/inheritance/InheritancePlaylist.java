package com.lld.learning.examples.inheritance;

/** A playlist has a next resource; it is not itself a resource in this model. */
public final class InheritancePlaylist {
    private final InheritanceResource next;

    public InheritancePlaylist(InheritanceResource next) {
        if (next == null) {
            throw new IllegalArgumentException("Next resource is required");
        }
        this.next = next;
    }

    public String describeNext() {
        return "Next: " + next.describe();
    }
}

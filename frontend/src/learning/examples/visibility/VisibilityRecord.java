package com.lld.learning.examples.visibility;

public class VisibilityRecord {
    private final String id;

    public VisibilityRecord(String id) {
        this.id = id;
    }

    public String summary() {
        return "public=" + id;
    }

    protected String subclassHint() {
        return "protected=" + id;
    }

    String packageHint() {
        return "package=" + id;
    }

    private String secret() {
        return "private=" + id;
    }

    public String inspectOwnMembers() {
        return summary() + "; " + subclassHint() + "; " + packageHint() + "; " + secret();
    }
}

// A top-level type with no access modifier is visible only inside this package.
final class InternalNote {}

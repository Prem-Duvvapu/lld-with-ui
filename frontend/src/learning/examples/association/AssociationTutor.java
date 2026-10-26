package com.lld.learning.examples.association;

/** A tutor exists independently of any learner's assignment. */
public final class AssociationTutor {
    private final String name;
    private final String subject;

    public AssociationTutor(String name, String subject) {
        if (name == null || name.isBlank() || subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("Tutor name and subject are required");
        }
        this.name = name.trim();
        this.subject = subject.trim();
    }

    public String getName() {
        return name;
    }

    public String getSubject() {
        return subject;
    }

    public String describe() {
        return name + " (" + subject + ")";
    }
}

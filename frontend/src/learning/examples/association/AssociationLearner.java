package com.lld.learning.examples.association;

/** Each learner has zero or one tutor; several learners may share a tutor. */
public final class AssociationLearner {
    private final String name;
    private final String subject;
    private AssociationTutor tutor; // null means unassigned, not a deleted tutor.

    public AssociationLearner(String name, String subject) {
        if (name == null || name.isBlank() || subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("Learner name and subject are required");
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

    public AssociationTutor getTutor() {
        return tutor; // The actual associated object, deliberately not a copy.
    }

    public void assignTutor(AssociationTutor candidate) {
        if (candidate == null) {
            throw new IllegalArgumentException("Tutor is required; use clearTutor to unassign");
        }
        // Exact, case-sensitive comparison after constructor trimming.
        if (!subject.equals(candidate.getSubject())) {
            throw new IllegalArgumentException("Tutor subject must match " + subject);
        }
        tutor = candidate; // Validation completes before the old link is replaced.
    }

    public void clearTutor() {
        tutor = null;
    }

    public String describeAssignment() {
        return name + " -> " + (tutor == null ? "unassigned" : tutor.describe());
    }
}

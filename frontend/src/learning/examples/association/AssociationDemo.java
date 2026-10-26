package com.lld.learning.examples.association;

public class AssociationDemo {
    public static void main(String[] args) {
        AssociationTutor mira = new AssociationTutor("Mira", "Java");
        AssociationTutor noor = new AssociationTutor("Noor", "Java");
        AssociationTutor sol = new AssociationTutor("Sol", "SQL");
        AssociationLearner ada = new AssociationLearner("Ada", "Java");
        AssociationLearner ben = new AssociationLearner("Ben", "Java");

        System.out.println("before: " + ada.describeAssignment() + "; " + ben.describeAssignment());
        ada.assignTutor(mira);
        ben.assignTutor(mira);
        System.out.println("shared: " + ada.describeAssignment() + "; " + ben.describeAssignment());

        AssociationTutor saved = ada.getTutor();
        ada.assignTutor(noor);
        System.out.println("reassigned: " + ada.describeAssignment() + "; " + ben.describeAssignment());
        System.out.println("saved tutor is Ben's: " + (saved == ben.getTutor()));

        try {
            ada.assignTutor(sol);
        } catch (IllegalArgumentException rejected) {
            System.out.println("rejected: " + rejected.getMessage());
        }
        System.out.println("after rejection: " + ada.describeAssignment());

        ada.clearTutor();
        ben.clearTutor();
        System.out.println("cleared: " + ada.describeAssignment() + "; " + ben.describeAssignment());
        System.out.println("tutors still usable: " + mira.describe() + "; " + noor.describe());
    }
}

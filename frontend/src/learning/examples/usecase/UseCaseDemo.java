package com.lld.learning.examples.usecase;

import java.util.Set;

public final class UseCaseDemo {
    public static void main(String[] args) {
        LibraryPortal portal = new LibraryPortal(Set.of("UML", "Java"));
        Member member = new Member("M1", true, false);
        Member librarian = new Member("L1", true, true);
        var plain = portal.borrow(member, "UML", false);
        System.out.println("borrow: " + plain.trace());
        System.out.println("base complete: active=" + plain.loan().active() + ", receipt=" + plain.receipt());
        System.out.println("renew: " + portal.renew(member, "UML") + ", due day=" + plain.loan().dueDay());

        var requested = portal.borrow(librarian, "Java", true);
        System.out.println("librarian borrows: " + requested.trace());
        System.out.println(requested.receipt());
        try {
            portal.recordReturn(member, "UML");
        } catch (IllegalArgumentException expected) {
            System.out.println("member return rejected: " + expected.getMessage());
        }
        System.out.println("return: " + portal.recordReturn(librarian, "UML")
                + ", active=" + plain.loan().active());
        try {
            portal.borrow(new Member("M2", false, false), "UML", true);
        } catch (IllegalStateException expected) {
            System.out.println("inactive borrow rejected: " + expected.getMessage());
        }
    }
}

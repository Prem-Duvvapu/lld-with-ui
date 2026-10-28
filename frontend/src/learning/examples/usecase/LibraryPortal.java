package com.lld.learning.examples.usecase;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Sequential illustrative implementation of the lending goals, not a UML execution engine. */
public final class LibraryPortal {
    private final Set<String> catalog;
    private final Map<String, Loan> loans = new HashMap<>();

    public LibraryPortal(Set<String> catalog) {
        Objects.requireNonNull(catalog, "catalog");
        catalog.forEach(title -> {
            if (Objects.requireNonNull(title, "title").isBlank()) {
                throw new IllegalArgumentException("Blank title");
            }
        });
        this.catalog = Set.copyOf(catalog);
    }

    public record Borrowing(Loan loan, String receipt, List<String> trace) {
        public Borrowing { trace = List.copyOf(trace); }
    }

    public Borrowing borrow(Member member, String title, boolean receiptRequested) {
        List<String> trace = new ArrayList<>();
        checkEligibility(member, trace);
        requireTitle(title);
        Loan previous = loans.get(title);
        if (previous != null && previous.active()) throw new IllegalStateException("Copy unavailable");
        Loan loan = new Loan(member.id(), title);
        loans.put(title, loan);
        trace.add("loan confirmed"); // Extension point: the base goal is already satisfied.
        String receipt = receiptRequested ? issueReceipt(loan, trace) : null;
        return new Borrowing(loan, receipt, trace);
    }

    public List<String> renew(Member member, String title) {
        List<String> trace = new ArrayList<>();
        checkEligibility(member, trace);
        Loan loan = loan(title);
        if (!loan.memberId().equals(member.id())) throw new IllegalArgumentException("Not your loan");
        loan.renew();
        trace.add("loan renewed");
        return List.copyOf(trace);
    }

    public List<String> recordReturn(Member operator, String title) {
        if (!Objects.requireNonNull(operator, "operator").librarian()) {
            throw new IllegalArgumentException("Librarian role required");
        }
        loan(title).close();
        return List.of("return recorded");
    }

    public Loan loan(String title) {
        requireTitle(title);
        Loan loan = loans.get(title);
        if (loan == null) throw new IllegalStateException("No loan for title");
        return loan;
    }

    private void checkEligibility(Member member, List<String> trace) {
        if (!Objects.requireNonNull(member, "member").active()) {
            throw new IllegalStateException("Membership inactive");
        }
        trace.add("eligibility accepted");
    }

    private String issueReceipt(Loan loan, List<String> trace) {
        trace.add("receipt issued");
        return "Receipt: " + loan.memberId() + " borrowed " + loan.title() + "; due day " + loan.dueDay();
    }

    private void requireTitle(String title) {
        if (!catalog.contains(Objects.requireNonNull(title, "title"))) {
            throw new IllegalArgumentException("Unknown title");
        }
    }
}

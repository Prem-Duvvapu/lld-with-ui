package com.lld.library.model;

public class LoanPolicy {
    private final int maxBooksAllowed;
    private final int loanDurationDays;

    public LoanPolicy(int maxBooksAllowed, int loanDurationDays) {
        this.maxBooksAllowed = maxBooksAllowed;
        this.loanDurationDays = loanDurationDays;
    }

    public int getMaxBooksAllowed() {
        return maxBooksAllowed;
    }

    public int getLoanDurationDays() {
        return loanDurationDays;
    }
}

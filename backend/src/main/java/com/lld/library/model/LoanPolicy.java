package com.lld.library.model;

import lombok.Getter;

@Getter
public class LoanPolicy {
    private final int maxBooksAllowed;
    private final int loanDurationDays;

    public LoanPolicy(int maxBooksAllowed, int loanDurationDays) {
        this.maxBooksAllowed = maxBooksAllowed;
        this.loanDurationDays = loanDurationDays;
    }
}

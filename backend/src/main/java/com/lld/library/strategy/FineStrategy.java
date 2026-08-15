package com.lld.library.strategy;

import com.lld.library.model.Loan;
import com.lld.library.model.Member;

import java.time.LocalDate;

public interface FineStrategy {
    double calculateFine(Loan loan, LocalDate returnDate, Member member);
}

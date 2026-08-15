package com.lld.library.strategy;

import com.lld.library.model.Loan;
import com.lld.library.model.Member;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Component
public class StandardFineStrategy implements FineStrategy {

    private final double dailyFineRate; // e.g. ₹5/day

    public StandardFineStrategy() {
        this.dailyFineRate = 5.0;
    }

    public StandardFineStrategy(double dailyFineRate) {
        this.dailyFineRate = dailyFineRate;
    }

    @Override
    public double calculateFine(Loan loan, LocalDate returnDate, Member member) {
        if (loan == null || returnDate == null || loan.getDueDate() == null) {
            return 0.0;
        }

        if (returnDate.isAfter(loan.getDueDate())) {
            long daysOverdue = ChronoUnit.DAYS.between(loan.getDueDate(), returnDate);
            return daysOverdue * dailyFineRate;
        }

        return 0.0;
    }

    public double getDailyFineRate() {
        return dailyFineRate;
    }
}

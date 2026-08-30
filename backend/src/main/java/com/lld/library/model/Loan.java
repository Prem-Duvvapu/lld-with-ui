package com.lld.library.model;

import com.lld.library.enums.LoanStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
public class Loan {
    private final String loanId;
    private final String copyId;
    private final String isbn;
    private final String memberId;
    private final LocalDate issueDate;
    private final LocalDate dueDate;
    @Setter
    private volatile LocalDate returnDate;
    @Setter
    private volatile LoanStatus status;
    @Setter
    private volatile double fineAmount;

    public Loan(String loanId, String copyId, String isbn, String memberId, LocalDate issueDate, LocalDate dueDate) {
        if (loanId == null || copyId == null || isbn == null || memberId == null) {
            throw new IllegalArgumentException("Loan parameters cannot be null");
        }
        this.loanId = loanId;
        this.copyId = copyId;
        this.isbn = isbn;
        this.memberId = memberId;
        this.issueDate = issueDate != null ? issueDate : LocalDate.now();
        this.dueDate = dueDate;
        this.status = LoanStatus.ACTIVE;
        this.fineAmount = 0.0;
    }
}

package com.lld.library.model;

import com.lld.library.enums.LoanStatus;

import java.time.LocalDate;

public class Loan {
    private final String loanId;
    private final String copyId;
    private final String isbn;
    private final String memberId;
    private final LocalDate issueDate;
    private final LocalDate dueDate;
    private volatile LocalDate returnDate;
    private volatile LoanStatus status;
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

    public String getLoanId() {
        return loanId;
    }

    public String getCopyId() {
        return copyId;
    }

    public String getIsbn() {
        return isbn;
    }

    public String getMemberId() {
        return memberId;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public LocalDate getReturnDate() {
        return returnDate;
    }

    public void setReturnDate(LocalDate returnDate) {
        this.returnDate = returnDate;
    }

    public LoanStatus getStatus() {
        return status;
    }

    public void setStatus(LoanStatus status) {
        this.status = status;
    }

    public double getFineAmount() {
        return fineAmount;
    }

    public void setFineAmount(double fineAmount) {
        this.fineAmount = fineAmount;
    }
}

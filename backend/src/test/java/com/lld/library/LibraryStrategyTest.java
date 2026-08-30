package com.lld.library;

import com.lld.library.enums.MemberType;
import com.lld.library.factory.MemberFactory;
import com.lld.library.model.Loan;
import com.lld.library.model.LoanPolicy;
import com.lld.library.model.Member;
import com.lld.library.strategy.StandardFineStrategy;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Strategy/Factory-flavour tests: {@link StandardFineStrategy}'s fine math in isolation from
 * {@code LibraryService}'s locking, and {@link MemberFactory}'s type-to-policy resolution.
 */
public class LibraryStrategyTest {

    private Loan loanDueOn(LocalDate dueDate) {
        return new Loan("LOAN-1", "C-1", "ISBN-1", "mem-1", dueDate.minusDays(14), dueDate);
    }

    // ---- StandardFineStrategy ----------------------------------------------

    @Test
    public void noFineWhenReturnedOnOrBeforeTheDueDate() {
        StandardFineStrategy strategy = new StandardFineStrategy(5.0);
        LocalDate dueDate = LocalDate.now().plusDays(3);
        Loan loan = loanDueOn(dueDate);

        assertEquals(0.0, strategy.calculateFine(loan, dueDate, null), "returning exactly on the due date is on time, not late");
        assertEquals(0.0, strategy.calculateFine(loan, dueDate.minusDays(1), null));
    }

    @Test
    public void fineAccruesAtTheDailyRateForEachDayOverdue() {
        StandardFineStrategy strategy = new StandardFineStrategy(5.0);
        LocalDate dueDate = LocalDate.now().minusDays(10);
        Loan loan = loanDueOn(dueDate);

        assertEquals(15.0, strategy.calculateFine(loan, dueDate.plusDays(3), null), 0.001);
        assertEquals(50.0, strategy.calculateFine(loan, dueDate.plusDays(10), null), 0.001);
    }

    @Test
    public void aDifferentDailyRateScalesTheFineProportionally() {
        StandardFineStrategy strategy = new StandardFineStrategy(2.5);
        LocalDate dueDate = LocalDate.now().minusDays(4);
        Loan loan = loanDueOn(dueDate);

        assertEquals(10.0, strategy.calculateFine(loan, dueDate.plusDays(4), null), 0.001);
        assertEquals(2.5, strategy.getDailyFineRate());
    }

    @Test
    public void nullInputsAreHandledWithoutThrowing() {
        StandardFineStrategy strategy = new StandardFineStrategy(5.0);
        assertEquals(0.0, strategy.calculateFine(null, LocalDate.now(), null));
        assertEquals(0.0, strategy.calculateFine(loanDueOn(LocalDate.now()), null, null));
    }

    @Test
    public void defaultConstructorUsesFiveRupeesPerDay() {
        assertEquals(5.0, new StandardFineStrategy().getDailyFineRate());
    }

    // ---- MemberFactory -------------------------------------------------------

    @Test
    public void eachMemberTypeResolvesToItsOwnDistinctPolicy() {
        LoanPolicy student = MemberFactory.getPolicyForType(MemberType.STUDENT);
        LoanPolicy faculty = MemberFactory.getPolicyForType(MemberType.FACULTY);
        LoanPolicy general = MemberFactory.getPolicyForType(MemberType.GENERAL);

        assertEquals(3, student.getMaxBooksAllowed());
        assertEquals(14, student.getLoanDurationDays());
        assertEquals(10, faculty.getMaxBooksAllowed());
        assertEquals(30, faculty.getLoanDurationDays());
        assertEquals(5, general.getMaxBooksAllowed());
        assertEquals(21, general.getLoanDurationDays());
    }

    @Test
    public void nullTypeDefaultsToTheGeneralPolicy() {
        LoanPolicy policy = MemberFactory.getPolicyForType(null);
        assertEquals(5, policy.getMaxBooksAllowed());
        assertEquals(21, policy.getLoanDurationDays());
    }

    @Test
    public void createMemberAttachesTheCorrectPolicyForItsType() {
        Member student = MemberFactory.createMember("mem-1", "Alice", "alice@school.edu", MemberType.STUDENT);
        assertEquals(MemberType.STUDENT, student.getType());
        assertEquals(3, student.getLoanPolicy().getMaxBooksAllowed());
    }
}

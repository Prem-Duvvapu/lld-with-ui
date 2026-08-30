package com.lld.library;

import com.lld.library.enums.LoanStatus;
import com.lld.library.enums.MemberType;
import com.lld.library.exception.BookNotAvailableException;
import com.lld.library.exception.BorrowLimitExceededException;
import com.lld.library.exception.InvalidReturnException;
import com.lld.library.model.Book;
import com.lld.library.model.Loan;
import com.lld.library.model.Member;
import com.lld.library.observer.DueDateNotifier;
import com.lld.library.observer.InAppLibraryNotificationObserver;
import com.lld.library.observer.LoggingLibraryNotificationObserver;
import com.lld.library.repository.LibraryRepository;
import com.lld.library.service.LibraryService;
import com.lld.library.strategy.StandardFineStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class LibraryServiceTest {

    private LibraryService service;

    @BeforeEach
    void setUp() {
        InAppLibraryNotificationObserver inApp = new InAppLibraryNotificationObserver();
        LoggingLibraryNotificationObserver logObs = new LoggingLibraryNotificationObserver();
        DueDateNotifier notifier = new DueDateNotifier();
        StandardFineStrategy fineStrategy = new StandardFineStrategy(5.0);
        service = new LibraryService(new LibraryRepository(), fineStrategy, notifier, inApp, logObs);
    }

    @Test
    void testBookAndMemberRegistration() {
        Book book = service.addBook("ISBN-TEST-1", "Concurrency in Java", "Brian Goetz", "Software", 2);
        assertNotNull(book);
        assertEquals(2, book.getTotalCopies());
        assertEquals(2, book.getAvailableCopiesCount());

        Member student = service.registerMember("Alice Student", "alice@school.edu", MemberType.STUDENT);
        assertEquals(3, student.getLoanPolicy().getMaxBooksAllowed());
        assertEquals(14, student.getLoanPolicy().getLoanDurationDays());

        Member faculty = service.registerMember("Prof. Bob", "bob@school.edu", MemberType.FACULTY);
        assertEquals(10, faculty.getLoanPolicy().getMaxBooksAllowed());
        assertEquals(30, faculty.getLoanPolicy().getLoanDurationDays());
    }

    @Test
    void testBorrowAndReturnSuccess() {
        Book book = service.addBook("ISBN-TEST-2", "Refactoring", "Martin Fowler", "Software", 2);
        Member member = service.registerMember("John Doe", "john@example.com", MemberType.GENERAL);

        // Borrow 1 copy
        Loan loan = service.borrowBook(member.getId(), book.getIsbn());
        assertNotNull(loan);
        assertEquals(LoanStatus.ACTIVE, loan.getStatus());
        assertEquals(1, member.getActiveLoanCount());
        assertEquals(1, book.getAvailableCopiesCount());

        // Return book
        Loan returnedLoan = service.returnBook(loan.getLoanId());
        assertEquals(LoanStatus.RETURNED, returnedLoan.getStatus());
        assertEquals(0, member.getActiveLoanCount());
        assertEquals(2, book.getAvailableCopiesCount());

        // Double return should throw InvalidReturnException
        assertThrows(InvalidReturnException.class, () -> {
            service.returnBook(loan.getLoanId());
        });
    }

    @Test
    void testLastCopyConcurrencyRace() {
        // Book with exactly 1 copy
        Book singleCopyBook = service.addBook("ISBN-SINGLE", "Rare Manuscript", "Ancient Scholar", "History", 1);
        Member m1 = service.registerMember("User 1", "u1@example.com", MemberType.GENERAL);
        Member m2 = service.registerMember("User 2", "u2@example.com", MemberType.GENERAL);

        // First borrow succeeds
        Loan loan1 = service.borrowBook(m1.getId(), singleCopyBook.getIsbn());
        assertNotNull(loan1);
        assertEquals(0, singleCopyBook.getAvailableCopiesCount());

        // Second borrow for the same single copy fails cleanly
        assertThrows(BookNotAvailableException.class, () -> {
            service.borrowBook(m2.getId(), singleCopyBook.getIsbn());
        });
    }

    @Test
    void testMemberBorrowLimitExceeded() {
        // Student member has a max limit of 3 books
        Member student = service.registerMember("Student Mark", "mark@school.edu", MemberType.STUDENT);
        service.addBook("ISBN-B1", "Book 1", "Author 1", "Fiction", 2);
        service.addBook("ISBN-B2", "Book 2", "Author 2", "Fiction", 2);
        service.addBook("ISBN-B3", "Book 3", "Author 3", "Fiction", 2);
        service.addBook("ISBN-B4", "Book 4", "Author 4", "Fiction", 2);

        service.borrowBook(student.getId(), "ISBN-B1");
        service.borrowBook(student.getId(), "ISBN-B2");
        service.borrowBook(student.getId(), "ISBN-B3");
        assertEquals(3, student.getActiveLoanCount());

        // 4th borrow must throw BorrowLimitExceededException
        assertThrows(BorrowLimitExceededException.class, () -> {
            service.borrowBook(student.getId(), "ISBN-B4");
        });
    }

    @Test
    void testFineCalculationAndPayment() {
        Member member = service.registerMember("Fined Member", "fine@example.com", MemberType.GENERAL);
        assertEquals(0.0, member.getAccruedFineBalance());

        member.addFine(50.0);
        assertEquals(50.0, member.getAccruedFineBalance());

        service.payFine(member.getId(), 30.0);
        assertEquals(20.0, member.getAccruedFineBalance());

        service.payFine(member.getId(), 50.0); // Overpay should cap at 0
        assertEquals(0.0, member.getAccruedFineBalance());
    }

    @Test
    void testScheduledDueDateSweep() {
        // Test scheduled sweep runs without exceptions
        assertDoesNotThrow(() -> {
            service.scheduledDueDateSweep();
        });
    }

    @Test
    void testSimulationEngine() {
        service.simReset();
        Map<String, Object> snapshot = service.getSimSnapshots();
        assertNotNull(snapshot);
        assertTrue(snapshot.containsKey("books"));
        assertTrue(snapshot.containsKey("members"));
        assertTrue(snapshot.containsKey("events"));

        // Borrow in simulation
        Map<String, Object> afterBorrow = service.simBorrow("sim-mem-1", "978-0132350884");
        assertNotNull(afterBorrow);

        // Trigger sweep
        Map<String, Object> afterSweep = service.simTriggerSweep(true);
        assertNotNull(afterSweep);

        assertFalse(service.getSimEvents().isEmpty());
    }
}

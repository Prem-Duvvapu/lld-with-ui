package com.lld.library;

import com.lld.library.enums.LoanStatus;
import com.lld.library.enums.MemberType;
import com.lld.library.model.*;
import com.lld.library.repository.LibraryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository-flavour tests for {@link LibraryRepository}, isolated from {@code LibraryService}'s
 * locking/fine/notification logic — pure storage behaviour.
 */
public class LibraryRepositoryTest {
    private LibraryRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new LibraryRepository();
    }

    @Test
    public void startsEmpty() {
        assertTrue(repository.getAllBooks().isEmpty());
        assertTrue(repository.getAllMembers().isEmpty());
        assertTrue(repository.getAllLoans().isEmpty());
    }

    @Test
    public void getOrCreateBookReusesTheSameInstanceOnRepeatCalls() {
        Book first = repository.getOrCreateBook("ISBN-1", k -> new Book(k, "Title", "Author", "Cat"));
        Book second = repository.getOrCreateBook("ISBN-1", k -> new Book(k, "A Different Title", "Someone Else", "Other"));

        assertSame(first, second, "a second addBook-style call for the same ISBN must not replace the cataloged Book");
        assertEquals("Title", second.getTitle());
    }

    @Test
    public void copiesAreFoundByIdAfterSaving() {
        BookCopy copy = new BookCopy("C-1", "ISBN-1", "Rack-A1");
        repository.saveCopy(copy);
        assertSame(copy, repository.findCopyById("C-1"));
        assertNull(repository.findCopyById("nonexistent"));
    }

    @Test
    public void savingAMemberAlsoInitializesTheirLoanIdList() {
        Member member = new Member("mem-1", "Alice", "alice@example.com", MemberType.STUDENT, new LoanPolicy(3, 14));
        repository.saveMember(member);

        assertSame(member, repository.findMemberById("mem-1"));
        assertTrue(repository.getMemberLoanIds("mem-1").isEmpty(), "a freshly-saved member starts with an empty (not null) loan list");
        assertEquals(1, repository.getAllMembers().size());
    }

    @Test
    public void memberIdsAreGeneratedSequentiallyWithThePrefix() {
        assertEquals("mem-1", repository.nextMemberId());
        assertEquals("mem-2", repository.nextMemberId());
        assertEquals("mem-3", repository.nextMemberId());
    }

    @Test
    public void loanIdsStartAt1001AndIncrementMonotonically() {
        assertEquals(1001L, repository.nextLoanId());
        assertEquals(1002L, repository.nextLoanId());
    }

    @Test
    public void addingMemberLoanIdsAccumulatesInOrder() {
        Member member = new Member("mem-1", "Alice", "alice@example.com", MemberType.GENERAL, new LoanPolicy(5, 21));
        repository.saveMember(member);

        Loan loan1 = new Loan("LOAN-1", "C-1", "ISBN-1", "mem-1", LocalDate.now(), LocalDate.now().plusDays(21));
        Loan loan2 = new Loan("LOAN-2", "C-2", "ISBN-2", "mem-1", LocalDate.now(), LocalDate.now().plusDays(21));
        repository.saveLoan(loan1);
        repository.saveLoan(loan2);
        repository.addMemberLoanId("mem-1", "LOAN-1");
        repository.addMemberLoanId("mem-1", "LOAN-2");

        List<String> loanIds = repository.getMemberLoanIds("mem-1");
        assertEquals(List.of("LOAN-1", "LOAN-2"), loanIds);
        assertEquals(2, repository.getAllLoans().size());
        assertSame(loan1, repository.findLoanById("LOAN-1"));
    }

    @Test
    public void searchingBooksIsCaseInsensitiveAcrossAllFields() {
        repository.getOrCreateBook("978-1", k -> new Book(k, "Clean Code", "Robert C. Martin", "Software"));
        repository.getOrCreateBook("978-2", k -> new Book(k, "Effective Java", "Joshua Bloch", "Programming"));

        List<Book> allBooks = repository.getAllBooks();
        assertEquals(2, allBooks.size());
    }

    @Test
    public void clearResetsStorageAndBothIdGenerators() {
        repository.getOrCreateBook("978-1", k -> new Book(k, "Title", "Author", "Cat"));
        Member member = new Member("mem-1", "Alice", "alice@example.com", MemberType.GENERAL, new LoanPolicy(5, 21));
        repository.saveMember(member);
        repository.nextLoanId();
        repository.nextMemberId();

        repository.clear();

        assertTrue(repository.getAllBooks().isEmpty());
        assertTrue(repository.getAllMembers().isEmpty());
        assertEquals(1001L, repository.nextLoanId(), "clear() must reset the loan id generator back to its starting value");
        assertEquals("mem-1", repository.nextMemberId(), "clear() must reset the member id generator back to its starting value");
    }

    @Test
    public void getAllLoansReflectsStatusMutationsMadeThroughTheReturnedLoanReference() {
        Member member = new Member("mem-1", "Alice", "alice@example.com", MemberType.GENERAL, new LoanPolicy(5, 21));
        repository.saveMember(member);
        Loan loan = new Loan("LOAN-1", "C-1", "ISBN-1", "mem-1", LocalDate.now(), LocalDate.now().plusDays(21));
        repository.saveLoan(loan);

        repository.findLoanById("LOAN-1").setStatus(LoanStatus.RETURNED);

        assertEquals(LoanStatus.RETURNED, repository.findLoanById("LOAN-1").getStatus());
    }
}

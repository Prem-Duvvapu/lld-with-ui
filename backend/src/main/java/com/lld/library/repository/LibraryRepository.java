package com.lld.library.repository;

import com.lld.library.model.Book;
import com.lld.library.model.BookCopy;
import com.lld.library.model.Loan;
import com.lld.library.model.Member;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

/**
 * In-memory catalog/member/loan store — one instance backs the live API, a second, fully
 * independent instance backs {@code /sim/*} (constructed directly by {@code LibraryService},
 * mirroring {@code movieticket.repository.MovieTicketRepository}'s two-instance shape).
 *
 * <p>Deliberately does NOT hold the per-book {@code ReentrantLock}s {@code LibraryService} uses to
 * serialize borrow/return — locking is a service-level concern coordinating a read-validate-mutate
 * span across this repository, not a storage concern, the same split {@code tictactoe.service
 * .TicTacToeService}'s {@code gameLocks} keeps outside its {@code GameRepository}.
 */
@Repository
public class LibraryRepository {
    private final Map<String, Book> booksByIsbn = new ConcurrentHashMap<>();
    private final Map<String, BookCopy> copiesById = new ConcurrentHashMap<>();
    private final Map<String, Member> membersById = new ConcurrentHashMap<>();
    private final Map<String, Loan> loansById = new ConcurrentHashMap<>();
    private final Map<String, List<String>> memberLoans = new ConcurrentHashMap<>();
    private final AtomicLong loanIdGen = new AtomicLong(1001);
    private final AtomicLong memberIdGen = new AtomicLong(1);

    // ── Books ────────────────────────────────────────────────────────────────

    public Book findBookByIsbn(String isbn) {
        return booksByIsbn.get(isbn);
    }

    /** Atomically returns the existing Book for {@code isbn}, or creates and stores one via {@code supplier}. */
    public Book getOrCreateBook(String isbn, Function<String, Book> supplier) {
        return booksByIsbn.computeIfAbsent(isbn, supplier);
    }

    public List<Book> getAllBooks() {
        return new ArrayList<>(booksByIsbn.values());
    }

    // ── Book copies ──────────────────────────────────────────────────────────

    public BookCopy findCopyById(String copyId) {
        return copiesById.get(copyId);
    }

    public void saveCopy(BookCopy copy) {
        copiesById.put(copy.getCopyId(), copy);
    }

    // ── Members ──────────────────────────────────────────────────────────────

    public Member findMemberById(String id) {
        return membersById.get(id);
    }

    public void saveMember(Member member) {
        membersById.put(member.getId(), member);
        memberLoans.putIfAbsent(member.getId(), new CopyOnWriteArrayList<>());
    }

    public List<Member> getAllMembers() {
        return new ArrayList<>(membersById.values());
    }

    public String nextMemberId() {
        return "mem-" + memberIdGen.getAndIncrement();
    }

    // ── Loans ────────────────────────────────────────────────────────────────

    public Loan findLoanById(String loanId) {
        return loansById.get(loanId);
    }

    public void saveLoan(Loan loan) {
        loansById.put(loan.getLoanId(), loan);
    }

    public Collection<Loan> getAllLoans() {
        return loansById.values();
    }

    public List<String> getMemberLoanIds(String memberId) {
        return memberLoans.getOrDefault(memberId, Collections.emptyList());
    }

    public void addMemberLoanId(String memberId, String loanId) {
        memberLoans.computeIfAbsent(memberId, k -> new CopyOnWriteArrayList<>()).add(loanId);
    }

    public long nextLoanId() {
        return loanIdGen.getAndIncrement();
    }

    // ── Reset (used by the isolated /sim/* engine's own repository instance) ──

    public void clear() {
        booksByIsbn.clear();
        copiesById.clear();
        membersById.clear();
        loansById.clear();
        memberLoans.clear();
        loanIdGen.set(1001);
        memberIdGen.set(1);
    }
}

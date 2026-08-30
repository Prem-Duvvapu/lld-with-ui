package com.lld.library.service;

import com.lld.library.enums.LoanStatus;
import com.lld.library.enums.MemberType;
import com.lld.library.enums.NotificationType;
import com.lld.library.exception.*;
import com.lld.library.factory.MemberFactory;
import com.lld.library.model.*;
import com.lld.library.observer.DueDateNotifier;
import com.lld.library.observer.InAppLibraryNotificationObserver;
import com.lld.library.observer.LoggingLibraryNotificationObserver;
import com.lld.library.repository.LibraryRepository;
import com.lld.library.strategy.FineStrategy;
import com.lld.library.strategy.StandardFineStrategy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class LibraryService {

    private final LibraryRepository repository;
    private final Map<String, ReentrantLock> bookLocks = new ConcurrentHashMap<>();

    private final FineStrategy fineStrategy;
    private final DueDateNotifier notifier;
    private final InAppLibraryNotificationObserver inAppObserver;

    // Isolated Simulation Engine State — a second, fully independent repository instance so
    // replaying the demo can never touch a real book/member/loan, mirroring
    // movieticket.service.MovieTicketService's simRepository shape.
    private final LibraryRepository simRepository = new LibraryRepository();
    private final Map<String, ReentrantLock> simBookLocks = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private final AtomicLong simLoanIdGen = new AtomicLong(5001);

    public LibraryService(LibraryRepository repository, FineStrategy fineStrategy, DueDateNotifier notifier,
                          InAppLibraryNotificationObserver inAppObserver,
                          LoggingLibraryNotificationObserver loggingObserver) {
        this.repository = repository;
        this.fineStrategy = fineStrategy != null ? fineStrategy : new StandardFineStrategy(5.0);
        this.notifier = notifier != null ? notifier : new DueDateNotifier();
        this.inAppObserver = inAppObserver != null ? inAppObserver : new InAppLibraryNotificationObserver();

        this.notifier.registerObserver(this.inAppObserver);
        if (loggingObserver != null) {
            this.notifier.registerObserver(loggingObserver);
        }

        initDefaultData();
        simReset();
    }

    // =========================================================================
    // CATALOG & MEMBER MANAGEMENT
    // =========================================================================

    public Book addBook(String isbn, String title, String author, String category, int initialCopies) {
        if (isbn == null || title == null) {
            throw new IllegalArgumentException("ISBN and Title cannot be null");
        }
        String cleanIsbn = isbn.trim();
        Book book = repository.getOrCreateBook(cleanIsbn, k -> new Book(cleanIsbn, title, author, category));

        for (int i = 1; i <= initialCopies; i++) {
            String copyId = cleanIsbn + "-C" + (book.getTotalCopies() + 1);
            BookCopy copy = new BookCopy(copyId, cleanIsbn, "Rack-" + (category != null ? category.substring(0, Math.min(3, category.length())).toUpperCase() : "GEN") + "-Shelf" + i);
            book.addCopy(copy);
            repository.saveCopy(copy);
        }
        return book;
    }

    public BookCopy addBookCopy(String isbn, String rackLocation) {
        Book book = repository.findBookByIsbn(isbn);
        if (book == null) {
            throw new BookNotAvailableException("Book with ISBN " + isbn + " does not exist in catalog.");
        }
        String copyId = isbn + "-C" + (book.getTotalCopies() + 1);
        BookCopy copy = new BookCopy(copyId, isbn, rackLocation);
        book.addCopy(copy);
        repository.saveCopy(copy);
        return copy;
    }

    public Member registerMember(String name, String email, MemberType type) {
        String memberId = repository.nextMemberId();
        Member member = MemberFactory.createMember(memberId, name, email, type);
        repository.saveMember(member);
        return member;
    }

    public Member getMember(String memberId) {
        Member m = repository.findMemberById(memberId);
        if (m == null) {
            throw new MemberNotFoundException("Member not found with ID: " + memberId);
        }
        return m;
    }

    public List<Member> getAllMembers() {
        return repository.getAllMembers();
    }

    public List<Book> searchBooks(String query) {
        if (query == null || query.trim().isEmpty()) {
            return repository.getAllBooks();
        }
        String q = query.trim().toLowerCase();
        return repository.getAllBooks().stream()
                .filter(b -> b.getTitle().toLowerCase().contains(q) ||
                             b.getAuthor().toLowerCase().contains(q) ||
                             b.getIsbn().toLowerCase().contains(q) ||
                             b.getCategory().toLowerCase().contains(q))
                .collect(Collectors.toList());
    }

    public List<Book> getAllBooks() {
        return repository.getAllBooks();
    }

    // =========================================================================
    // BORROW & RETURN CORE WORKFLOWS (CONCURRENCY LAYER)
    // =========================================================================

    public Loan borrowBook(String memberId, String isbn) {
        Member member = getMember(memberId);
        Book book = repository.findBookByIsbn(isbn);
        if (book == null) {
            throw new BookNotAvailableException("Book with ISBN " + isbn + " not found");
        }

        // 1. Guard borrow quota under per-member lock
        member.getLock().lock();
        try {
            if (member.getActiveLoanCount() >= member.getLoanPolicy().getMaxBooksAllowed()) {
                throw new BorrowLimitExceededException(String.format(
                        "Member %s has reached the maximum allowed limit of %d books for %s type.",
                        member.getName(), member.getLoanPolicy().getMaxBooksAllowed(), member.getType()));
            }
            member.incrementLoanCount();
        } finally {
            member.getLock().unlock();
        }

        // 2. Find and assign copy under per-book lock
        ReentrantLock bookLock = bookLocks.computeIfAbsent(isbn, k -> new ReentrantLock(true));
        BookCopy assignedCopy = null;
        bookLock.lock();
        try {
            assignedCopy = book.findAvailableCopy();
            if (assignedCopy == null) {
                // Compensating action: revert member active loan count
                member.getLock().lock();
                try {
                    member.decrementLoanCount();
                } finally {
                    member.getLock().unlock();
                }
                throw new BookNotAvailableException(String.format("All %d copies of '%s' are currently borrowed.",
                        book.getTotalCopies(), book.getTitle()));
            }
            assignedCopy.setAvailable(false);
        } finally {
            bookLock.unlock();
        }

        // 3. Register Loan
        String loanId = "LOAN-" + repository.nextLoanId();
        LocalDate issueDate = LocalDate.now();
        LocalDate dueDate = issueDate.plusDays(member.getLoanPolicy().getLoanDurationDays());
        Loan loan = new Loan(loanId, assignedCopy.getCopyId(), isbn, memberId, issueDate, dueDate);

        repository.saveLoan(loan);
        repository.addMemberLoanId(memberId, loanId);

        notifier.notifyObservers(memberId, NotificationType.BOOK_BORROWED,
                String.format("Borrowed '%s' (Copy: %s). Due date: %s.", book.getTitle(), assignedCopy.getCopyId(), dueDate),
                loanId);

        return loan;
    }

    public Loan returnBook(String loanId) {
        Loan loan = repository.findLoanById(loanId);
        if (loan == null) {
            throw new LoanNotFoundException("Loan record not found with ID: " + loanId);
        }

        if (loan.getStatus() == LoanStatus.RETURNED) {
            throw new InvalidReturnException("Book for loan " + loanId + " has already been returned.");
        }

        Book book = repository.findBookByIsbn(loan.getIsbn());
        BookCopy copy = repository.findCopyById(loan.getCopyId());
        Member member = repository.findMemberById(loan.getMemberId());

        LocalDate returnDate = LocalDate.now();
        loan.setReturnDate(returnDate);
        loan.setStatus(LoanStatus.RETURNED);

        // Replenish copy under book lock
        if (book != null && copy != null) {
            ReentrantLock bookLock = bookLocks.computeIfAbsent(loan.getIsbn(), k -> new ReentrantLock(true));
            bookLock.lock();
            try {
                copy.setAvailable(true);
            } finally {
                bookLock.unlock();
            }
        }

        // Decrement member count under member lock
        if (member != null) {
            member.getLock().lock();
            try {
                member.decrementLoanCount();
            } finally {
                member.getLock().unlock();
            }

            // Calculate Fines if overdue
            if (returnDate.isAfter(loan.getDueDate())) {
                double fine = fineStrategy.calculateFine(loan, returnDate, member);
                loan.setFineAmount(fine);
                member.addFine(fine);

                notifier.notifyObservers(member.getId(), NotificationType.FINE_LEVIED,
                        String.format("Fine of ₹%.2f accrued on return of '%s' (%d days overdue).",
                                fine, book != null ? book.getTitle() : loan.getIsbn(),
                                ChronoUnit.DAYS.between(loan.getDueDate(), returnDate)),
                        loanId);
            }

            notifier.notifyObservers(member.getId(), NotificationType.BOOK_RETURNED,
                    String.format("Returned '%s' successfully.", book != null ? book.getTitle() : loan.getIsbn()),
                    loanId);
        }

        return loan;
    }

    public void payFine(String memberId, double amount) {
        Member member = getMember(memberId);
        member.getLock().lock();
        try {
            member.payFine(amount);
        } finally {
            member.getLock().unlock();
        }
    }

    public List<Loan> getActiveLoansForMember(String memberId) {
        getMember(memberId);
        List<String> loanIds = repository.getMemberLoanIds(memberId);
        return loanIds.stream()
                .map(repository::findLoanById)
                .filter(l -> l != null && l.getStatus() != LoanStatus.RETURNED)
                .collect(Collectors.toList());
    }

    public List<Loan> getLoanHistoryForMember(String memberId) {
        getMember(memberId);
        List<String> loanIds = repository.getMemberLoanIds(memberId);
        return loanIds.stream()
                .map(repository::findLoanById)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<Notification> getNotificationsForMember(String memberId) {
        return inAppObserver.getNotificationsForMember(memberId);
    }

    // =========================================================================
    // DUE-DATE BACKGROUND SWEEP (OBSERVER PATTERN TRIGGER)
    // =========================================================================

    @Scheduled(fixedRate = 30000)
    public void scheduledDueDateSweep() {
        LocalDate today = LocalDate.now();
        for (Loan loan : repository.getAllLoans()) {
            if (loan.getStatus() == LoanStatus.ACTIVE) {
                long daysUntilDue = ChronoUnit.DAYS.between(today, loan.getDueDate());
                Book book = repository.findBookByIsbn(loan.getIsbn());
                String title = book != null ? book.getTitle() : loan.getIsbn();

                if (today.isAfter(loan.getDueDate())) {
                    loan.setStatus(LoanStatus.OVERDUE);
                    notifier.notifyObservers(loan.getMemberId(), NotificationType.BOOK_OVERDUE,
                            String.format("OVERDUE: '%s' was due on %s. Please return immediately.", title, loan.getDueDate()),
                            loan.getLoanId());
                } else if (daysUntilDue <= 2 && daysUntilDue >= 0) {
                    notifier.notifyObservers(loan.getMemberId(), NotificationType.DUE_DATE_REMINDER,
                            String.format("REMINDER: '%s' is due in %d day(s) on %s.", title, daysUntilDue, loan.getDueDate()),
                            loan.getLoanId());
                }
            }
        }
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized void simReset() {
        simEventLog.clear();
        simRepository.clear();
        simBookLocks.clear();

        // 1. Seed Books
        // Book 1: Clean Code (1 copy only -> for Last Copy Race)
        Book b1 = new Book("978-0132350884", "Clean Code", "Robert C. Martin", "Software");
        BookCopy b1c1 = new BookCopy("978-0132350884-C1", "978-0132350884", "Rack-A1");
        b1.addCopy(b1c1);
        simRepository.getOrCreateBook(b1.getIsbn(), k -> b1);
        simRepository.saveCopy(b1c1);

        // Book 2: Effective Java (2 copies)
        Book b2 = new Book("978-0134685991", "Effective Java", "Joshua Bloch", "Software");
        BookCopy b2c1 = new BookCopy("978-0134685991-C1", "978-0134685991", "Rack-A2");
        BookCopy b2c2 = new BookCopy("978-0134685991-C2", "978-0134685991", "Rack-A2");
        b2.addCopy(b2c1);
        b2.addCopy(b2c2);
        simRepository.getOrCreateBook(b2.getIsbn(), k -> b2);
        simRepository.saveCopy(b2c1);
        simRepository.saveCopy(b2c2);

        // Book 3: Design Patterns (2 copies)
        Book b3 = new Book("978-0201633610", "Design Patterns", "Gang of Four", "Software");
        BookCopy b3c1 = new BookCopy("978-0201633610-C1", "978-0201633610", "Rack-B1");
        BookCopy b3c2 = new BookCopy("978-0201633610-C2", "978-0201633610", "Rack-B1");
        b3.addCopy(b3c1);
        b3.addCopy(b3c2);
        simRepository.getOrCreateBook(b3.getIsbn(), k -> b3);
        simRepository.saveCopy(b3c1);
        simRepository.saveCopy(b3c2);

        // 2. Seed Members
        Member m1 = MemberFactory.createMember("sim-mem-1", "Alice Vance (Student)", "alice@university.edu", MemberType.STUDENT); // Max 3 books
        Member m2 = MemberFactory.createMember("sim-mem-2", "Prof. Bob (Faculty)", "bob@university.edu", MemberType.FACULTY);     // Max 10 books
        Member m3 = MemberFactory.createMember("sim-mem-3", "Charlie (General)", "charlie@public.org", MemberType.GENERAL);        // Max 5 books

        simRepository.saveMember(m1);
        simRepository.saveMember(m2);
        simRepository.saveMember(m3);

        logSimEvent("SIM_RESET", "System", "Initialized simulation catalog (3 books, 5 total copies) and 3 typed members.", null);
    }

    public synchronized Map<String, Object> simBorrow(String memberId, String isbn) {
        Member member = simRepository.findMemberById(memberId);
        Book book = simRepository.findBookByIsbn(isbn);
        if (member == null || book == null) {
            logSimEvent("BORROW_FAILED", memberId, "Invalid member or book ISBN", null);
            return getSimSnapshots();
        }

        // Check Limit
        if (member.getActiveLoanCount() >= member.getLoanPolicy().getMaxBooksAllowed()) {
            logSimEvent("BORROW_REJECTED", member.getName(),
                    String.format("BORROW LIMIT EXCEEDED! Active: %d/%d books for %s",
                            member.getActiveLoanCount(), member.getLoanPolicy().getMaxBooksAllowed(), member.getType()),
                    null);
            return getSimSnapshots();
        }

        // Check Copy under lock
        BookCopy freeCopy = book.findAvailableCopy();
        if (freeCopy == null) {
            logSimEvent("BORROW_REJECTED", member.getName(),
                    String.format("LAST COPY RACE: No copies available for '%s' (0/%d free)", book.getTitle(), book.getTotalCopies()),
                    null);
            return getSimSnapshots();
        }

        freeCopy.setAvailable(false);
        member.incrementLoanCount();

        String loanId = "SIM-LOAN-" + simLoanIdGen.getAndIncrement();
        LocalDate issueDate = LocalDate.now();
        LocalDate dueDate = issueDate.plusDays(member.getLoanPolicy().getLoanDurationDays());
        Loan loan = new Loan(loanId, freeCopy.getCopyId(), isbn, memberId, issueDate, dueDate);

        simRepository.saveLoan(loan);
        simRepository.addMemberLoanId(memberId, loanId);

        logSimEvent("BORROW_SUCCESS", member.getName(),
                String.format("Borrowed '%s' (Copy: %s). Due date: %s", book.getTitle(), freeCopy.getCopyId(), dueDate),
                Map.of("loanId", loanId, "copyId", freeCopy.getCopyId()));

        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simReturn(String loanId) {
        Loan loan = simRepository.findLoanById(loanId);
        if (loan == null || loan.getStatus() == LoanStatus.RETURNED) {
            logSimEvent("RETURN_FAILED", "System", "Loan already returned or not found: " + loanId, null);
            return getSimSnapshots();
        }

        BookCopy copy = simRepository.findCopyById(loan.getCopyId());
        Book book = simRepository.findBookByIsbn(loan.getIsbn());
        Member member = simRepository.findMemberById(loan.getMemberId());

        if (copy != null) copy.setAvailable(true);
        loan.setStatus(LoanStatus.RETURNED);
        LocalDate returnDate = LocalDate.now();
        loan.setReturnDate(returnDate);

        if (member != null) {
            member.decrementLoanCount();
            if (returnDate.isAfter(loan.getDueDate())) {
                long days = ChronoUnit.DAYS.between(loan.getDueDate(), returnDate);
                double fine = days * 5.0;
                loan.setFineAmount(fine);
                member.addFine(fine);
                logSimEvent("RETURN_WITH_FINE", member.getName(),
                        String.format("Overdue return for '%s'! Fine of ₹%.2f applied (%d days late).",
                                book != null ? book.getTitle() : loan.getIsbn(), fine, days),
                        Map.of("fine", fine));
                return getSimSnapshots();
            }
        }

        logSimEvent("RETURN_SUCCESS", member != null ? member.getName() : "Member",
                String.format("Returned '%s' (Copy: %s) on time.", book != null ? book.getTitle() : loan.getIsbn(), copy != null ? copy.getCopyId() : ""),
                null);

        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simTriggerSweep(boolean makeOverdue) {
        for (Loan loan : simRepository.getAllLoans()) {
            if (loan.getStatus() == LoanStatus.ACTIVE) {
                Book book = simRepository.findBookByIsbn(loan.getIsbn());
                Member member = simRepository.findMemberById(loan.getMemberId());
                String title = book != null ? book.getTitle() : loan.getIsbn();

                if (makeOverdue) {
                    loan.setStatus(LoanStatus.OVERDUE);
                    logSimEvent("SWEEP_OVERDUE", member != null ? member.getName() : loan.getMemberId(),
                            String.format("OVERDUE ALERT: Loan %s for '%s' is past due date!", loan.getLoanId(), title),
                            null);
                } else {
                    logSimEvent("SWEEP_REMINDER", member != null ? member.getName() : loan.getMemberId(),
                            String.format("DUE DATE REMINDER: '%s' is due soon on %s.", title, loan.getDueDate()),
                            null);
                }
            }
        }
        return getSimSnapshots();
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("books", simRepository.getAllBooks());
        res.put("members", simRepository.getAllMembers());
        res.put("loans", simRepository.getAllLoans());
        res.put("events", simEventLog);
        return res;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }

    // =========================================================================
    // SEED DATA INITIALIZATION
    // =========================================================================

    private void initDefaultData() {
        // Books
        addBook("978-0132350884", "Clean Code", "Robert C. Martin", "Software Engineering", 3);
        addBook("978-0134685991", "Effective Java", "Joshua Bloch", "Programming", 2);
        addBook("978-0201633610", "Design Patterns", "Erich Gamma et al.", "Software Architecture", 2);
        addBook("978-0135957059", "The Pragmatic Programmer", "David Thomas", "Software Engineering", 1);
        addBook("978-1491950357", "Designing Data-Intensive Applications", "Martin Kleppmann", "Distributed Systems", 2);

        // Members
        Member m1 = registerMember("Alice Johnson", "alice@university.edu", MemberType.STUDENT);
        Member m2 = registerMember("Prof. Robert Smith", "rsmith@university.edu", MemberType.FACULTY);
        Member m3 = registerMember("Diana Prince", "diana@citylibrary.org", MemberType.GENERAL);

        // Sample initial loan
        borrowBook(m1.getId(), "978-0132350884");
    }
}

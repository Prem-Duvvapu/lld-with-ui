package com.lld.library;

import com.lld.library.enums.MemberType;
import com.lld.library.exception.BookNotAvailableException;
import com.lld.library.exception.BorrowLimitExceededException;
import com.lld.library.model.Book;
import com.lld.library.model.Member;
import com.lld.library.observer.DueDateNotifier;
import com.lld.library.observer.InAppLibraryNotificationObserver;
import com.lld.library.observer.LoggingLibraryNotificationObserver;
import com.lld.library.repository.LibraryRepository;
import com.lld.library.service.LibraryService;
import com.lld.library.strategy.StandardFineStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Genuine multi-threaded concurrency tests — {@code LibraryServiceTest#testLastCopyConcurrencyRace}
 * only ever called {@code borrowBook} twice, sequentially, which cannot exercise the per-book
 * {@code ReentrantLock} at all (there is no window for two calls to race a sequential test, the
 * exact gap RCA-033's Preventative Measures #3 calls out). These use real threads released
 * simultaneously by a {@link CountDownLatch}.
 */
public class LibraryConcurrencyTest {
    private LibraryService service;

    @BeforeEach
    public void setUp() {
        InAppLibraryNotificationObserver inApp = new InAppLibraryNotificationObserver();
        LoggingLibraryNotificationObserver logObs = new LoggingLibraryNotificationObserver();
        DueDateNotifier notifier = new DueDateNotifier();
        service = new LibraryService(new LibraryRepository(), new StandardFineStrategy(5.0), notifier, inApp, logObs);
    }

    @Test
    public void concurrentBorrowsForTheLastCopyExactlyOneWins() throws Exception {
        Book book = service.addBook("ISBN-RACE-1", "Rare Manuscript", "Ancient Scholar", "History", 1);
        int threads = 12;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            Member member = service.registerMember("Racer " + i, "racer" + i + "@example.com", MemberType.GENERAL);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.borrowBook(member.getId(), book.getIsbn());
                    successCount.incrementAndGet();
                } catch (BookNotAvailableException e) {
                    rejectedCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, successCount.get(), "exactly one of 12 racers should win the single copy");
        assertEquals(threads - 1, rejectedCount.get());
        assertEquals(0, book.getAvailableCopiesCount());
    }

    @Test
    public void concurrentBorrowsNeverExceedAMembersLoanLimit() throws Exception {
        // A GENERAL member's policy allows 5 books at once.
        Member member = service.registerMember("Limit Tester", "limit@example.com", MemberType.GENERAL);
        int bookCount = 10;
        for (int i = 0; i < bookCount; i++) {
            service.addBook("ISBN-LIMIT-" + i, "Book " + i, "Author " + i, "Fiction", 5);
        }

        ExecutorService executor = Executors.newFixedThreadPool(bookCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(bookCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < bookCount; i++) {
            final String isbn = "ISBN-LIMIT-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.borrowBook(member.getId(), isbn);
                    successCount.incrementAndGet();
                } catch (BorrowLimitExceededException e) {
                    rejectedCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // 10 threads race against a limit of 5 distinct books — the per-member lock around the
        // quota check+increment must let exactly 5 through, never more (a lost update here would
        // let the member walk away with 6+ active loans).
        assertEquals(5, successCount.get(), "exactly 5 concurrent borrows should succeed under a 5-book limit");
        assertEquals(bookCount - 5, rejectedCount.get());
        assertEquals(5, member.getActiveLoanCount());
    }

    @Test
    public void concurrentFinePaymentsNeverLetTheBalanceGoNegativeOrLoseAnUpdate() throws Exception {
        Member member = service.registerMember("Payer", "payer@example.com", MemberType.GENERAL);
        member.addFine(1000.0);

        int threads = 20;
        double perThreadPayment = 40.0; // 20 x 40 = 800, leaving 200 if every payment lands
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.payFine(member.getId(), perThreadPayment);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(200.0, member.getAccruedFineBalance(), 0.001,
                "every one of 20 concurrent payments must land — a lost update would leave the balance higher than 200");
    }
}

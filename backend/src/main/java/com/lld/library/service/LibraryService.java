package com.lld.library.service;

import com.lld.library.model.Book;
import com.lld.library.model.BorrowRecord;
import com.lld.library.model.Member;
import com.lld.library.repository.LibraryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class LibraryService {
    private final LibraryRepository repository;
    private final ReentrantLock lock = new ReentrantLock();
    private static final double FINE_PER_DAY = 5.0;
    private static final int BORROW_DAYS = 14;

    public LibraryService(LibraryRepository repository) {
        this.repository = repository;
    }

    public List<Book> searchBooks(String q) {
        return repository.searchBooks(q);
    }

    public List<Book> getAvailableBooks() {
        return repository.searchBooks("").stream()
            .filter(b -> "AVAILABLE".equals(b.getStatus()))
            .toList();
    }

    public BorrowRecord borrowBook(long memberId, long bookId) {
        lock.lock();
        try {
            Member member = repository.findMemberById(memberId);
            if (member == null) throw new IllegalArgumentException("Member not found");

            Book book = repository.findBookById(bookId);
            if (book == null) throw new IllegalArgumentException("Book not found");
            if (!"AVAILABLE".equals(book.getStatus())) throw new IllegalArgumentException("Book is not available");

            book.setStatus("BORROWED");
            repository.saveBook(book);

            BorrowRecord record = new BorrowRecord(
                repository.nextRecordId(), bookId, memberId,
                LocalDate.now(), LocalDate.now().plusDays(BORROW_DAYS)
            );
            return repository.saveBorrowRecord(record);
        } finally {
            lock.unlock();
        }
    }

    public BorrowRecord returnBook(long recordId) {
        lock.lock();
        try {
            BorrowRecord record = repository.findBorrowRecordById(recordId);
            if (record == null) throw new IllegalArgumentException("Borrow record not found");
            if (record.getReturnDate() != null) throw new IllegalArgumentException("Book already returned");

            LocalDate now = LocalDate.now();
            record.setReturnDate(now);

            if (now.isAfter(record.getDueDate())) {
                long daysOverdue = ChronoUnit.DAYS.between(record.getDueDate(), now);
                record.setFine(daysOverdue * FINE_PER_DAY);
            }

            Book book = repository.findBookById(record.getBookId());
            if (book != null) {
                book.setStatus("AVAILABLE");
                repository.saveBook(book);
            }

            return repository.saveBorrowRecord(record);
        } finally {
            lock.unlock();
        }
    }

    public List<BorrowRecord> getMemberHistory(long memberId) {
        Member member = repository.findMemberById(memberId);
        if (member == null) throw new IllegalArgumentException("Member not found");
        return repository.getMemberHistory(memberId);
    }

    public List<Member> getAllMembers() {
        return List.of(
            repository.findMemberById(1L),
            repository.findMemberById(2L)
        ).stream().filter(m -> m != null).toList();
    }
}

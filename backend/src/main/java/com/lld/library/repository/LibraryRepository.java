package com.lld.library.repository;

import com.lld.library.model.Book;
import com.lld.library.model.Member;
import com.lld.library.model.BorrowRecord;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class LibraryRepository {
    private final Map<Long, Book> books = new ConcurrentHashMap<>();
    private final Map<Long, Member> members = new ConcurrentHashMap<>();
    private final Map<Long, BorrowRecord> borrowRecords = new ConcurrentHashMap<>();
    private final AtomicLong bookIdGen = new AtomicLong(1);
    private final AtomicLong memberIdGen = new AtomicLong(1);
    private final AtomicLong recordIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public LibraryRepository() {
        saveBook(new Book(bookIdGen.getAndIncrement(), "The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "AVAILABLE"));
        saveBook(new Book(bookIdGen.getAndIncrement(), "To Kill a Mockingbird", "Harper Lee", "9780061120084", "AVAILABLE"));
        saveBook(new Book(bookIdGen.getAndIncrement(), "1984", "George Orwell", "9780451524935", "AVAILABLE"));
        saveBook(new Book(bookIdGen.getAndIncrement(), "Pride and Prejudice", "Jane Austen", "9780141439518", "AVAILABLE"));
        saveBook(new Book(bookIdGen.getAndIncrement(), "The Catcher in the Rye", "J.D. Salinger", "9780316769488", "AVAILABLE"));
        saveBook(new Book(bookIdGen.getAndIncrement(), "Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "9780439708180", "BORROWED"));

        Member alice = new Member(memberIdGen.getAndIncrement(), "Alice Johnson", "alice@example.com", LocalDate.of(2024, 1, 15));
        Member bob = new Member(memberIdGen.getAndIncrement(), "Bob Smith", "bob@example.com", LocalDate.of(2024, 3, 20));
        saveMember(alice);
        saveMember(bob);

        BorrowRecord existing = new BorrowRecord(recordIdGen.getAndIncrement(), 6L, alice.getId(), LocalDate.now().minusDays(5), LocalDate.now().plusDays(2));
        borrowRecords.put(existing.getId(), existing);
    }

    public void saveBook(Book book) {
        lock.lock();
        try { books.put(book.getId(), book); }
        finally { lock.unlock(); }
    }

    public void saveMember(Member member) {
        lock.lock();
        try { members.put(member.getId(), member); }
        finally { lock.unlock(); }
    }

    public List<Book> searchBooks(String q) {
        if (q == null || q.isBlank()) return new ArrayList<>(books.values());
        String lower = q.toLowerCase();
        return books.values().stream()
            .filter(b -> b.getTitle().toLowerCase().contains(lower)
                      || b.getAuthor().toLowerCase().contains(lower)
                      || b.getIsbn().toLowerCase().contains(lower))
            .collect(Collectors.toList());
    }

    public Book findBookById(long id) { return books.get(id); }

    public Member findMemberById(long id) { return members.get(id); }

    public BorrowRecord saveBorrowRecord(BorrowRecord record) {
        lock.lock();
        try {
            borrowRecords.put(record.getId(), record);
            return record;
        } finally { lock.unlock(); }
    }

    public BorrowRecord findBorrowRecordById(long id) { return borrowRecords.get(id); }

    public List<BorrowRecord> getMemberHistory(long memberId) {
        return borrowRecords.values().stream()
            .filter(r -> r.getMemberId() == memberId)
            .sorted((a, b) -> b.getBorrowDate().compareTo(a.getBorrowDate()))
            .collect(Collectors.toList());
    }

    public List<BorrowRecord> getActiveBorrowByBookId(long bookId) {
        return borrowRecords.values().stream()
            .filter(r -> r.getBookId() == bookId && r.getReturnDate() == null)
            .collect(Collectors.toList());
    }

    public long nextBookId() { return bookIdGen.getAndIncrement(); }
    public long nextRecordId() { return recordIdGen.getAndIncrement(); }
}

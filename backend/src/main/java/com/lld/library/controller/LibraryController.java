package com.lld.library.controller;

import com.lld.library.model.Book;
import com.lld.library.model.BorrowRecord;
import com.lld.library.model.Member;
import com.lld.library.service.LibraryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/library")
@CrossOrigin(origins = "*")
public class LibraryController {
    private final LibraryService libraryService;

    public LibraryController(LibraryService libraryService) {
        this.libraryService = libraryService;
    }

    @GetMapping("/books/search")
    public ResponseEntity<List<Book>> searchBooks(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(libraryService.searchBooks(q));
    }

    @GetMapping("/books/available")
    public ResponseEntity<List<Book>> getAvailableBooks() {
        return ResponseEntity.ok(libraryService.getAvailableBooks());
    }

    @PostMapping("/borrow")
    public ResponseEntity<Map<String, Object>> borrowBook(@RequestBody Map<String, Long> request) {
        try {
            BorrowRecord record = libraryService.borrowBook(request.get("memberId"), request.get("bookId"));
            Book book = libraryService.searchBooks("").stream()
                .filter(b -> b.getId() == record.getBookId()).findFirst().orElse(null);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", record.getId());
            response.put("bookId", record.getBookId());
            response.put("memberId", record.getMemberId());
            response.put("borrowDate", record.getBorrowDate().toString());
            response.put("dueDate", record.getDueDate().toString());
            response.put("bookTitle", book != null ? book.getTitle() : "");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/return")
    public ResponseEntity<Map<String, Object>> returnBook(@RequestBody Map<String, Long> request) {
        try {
            BorrowRecord record = libraryService.returnBook(request.get("recordId"));
            Book book = libraryService.searchBooks("").stream()
                .filter(b -> b.getId() == record.getBookId()).findFirst().orElse(null);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", record.getId());
            response.put("bookId", record.getBookId());
            response.put("borrowDate", record.getBorrowDate().toString());
            response.put("dueDate", record.getDueDate().toString());
            response.put("returnDate", record.getReturnDate() != null ? record.getReturnDate().toString() : "");
            response.put("fine", record.getFine());
            response.put("bookTitle", book != null ? book.getTitle() : "");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/members/{memberId}/history")
    public ResponseEntity<?> getMemberHistory(@PathVariable long memberId) {
        try {
            return ResponseEntity.ok(libraryService.getMemberHistory(memberId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/members")
    public ResponseEntity<List<Member>> getMembers() {
        return ResponseEntity.ok(libraryService.getAllMembers());
    }
}

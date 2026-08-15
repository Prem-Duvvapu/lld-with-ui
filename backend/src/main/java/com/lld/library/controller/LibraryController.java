package com.lld.library.controller;

import com.lld.library.enums.MemberType;
import com.lld.library.model.*;
import com.lld.library.service.LibraryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    // =========================================================================
    // BOOKS & CATALOG
    // =========================================================================

    @GetMapping("/books")
    public ResponseEntity<List<Book>> getAllBooks() {
        return ResponseEntity.ok(libraryService.getAllBooks());
    }

    @GetMapping("/books/search")
    public ResponseEntity<List<Book>> searchBooks(@RequestParam(required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(libraryService.searchBooks(query));
    }

    @PostMapping("/books")
    public ResponseEntity<Book> addBook(@RequestBody Map<String, Object> body) {
        String isbn = (String) body.get("isbn");
        String title = (String) body.get("title");
        String author = (String) body.get("author");
        String category = (String) body.get("category");
        int copies = body.get("copies") != null ? Integer.parseInt(body.get("copies").toString()) : 1;

        Book book = libraryService.addBook(isbn, title, author, category, copies);
        return ResponseEntity.ok(book);
    }

    @PostMapping("/books/{isbn}/copies")
    public ResponseEntity<BookCopy> addCopy(@PathVariable String isbn, @RequestBody(required = false) Map<String, String> body) {
        String rack = body != null ? body.get("rackLocation") : "Rack-Gen";
        BookCopy copy = libraryService.addBookCopy(isbn, rack);
        return ResponseEntity.ok(copy);
    }

    // =========================================================================
    // MEMBERS
    // =========================================================================

    @GetMapping("/members")
    public ResponseEntity<List<Member>> getAllMembers() {
        return ResponseEntity.ok(libraryService.getAllMembers());
    }

    @GetMapping("/members/{memberId}")
    public ResponseEntity<Member> getMember(@PathVariable String memberId) {
        return ResponseEntity.ok(libraryService.getMember(memberId));
    }

    @PostMapping("/members")
    public ResponseEntity<Member> registerMember(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        MemberType type = body.get("type") != null ? MemberType.valueOf(body.get("type")) : MemberType.GENERAL;

        Member member = libraryService.registerMember(name, email, type);
        return ResponseEntity.ok(member);
    }

    @PostMapping("/members/{memberId}/pay-fine")
    public ResponseEntity<Map<String, Object>> payFine(@PathVariable String memberId, @RequestBody Map<String, Double> body) {
        double amount = body.getOrDefault("amount", 0.0);
        libraryService.payFine(memberId, amount);
        Member member = libraryService.getMember(memberId);
        return ResponseEntity.ok(Map.of(
                "memberId", memberId,
                "remainingFine", member.getAccruedFineBalance(),
                "message", "Fine payment successful"
        ));
    }

    // =========================================================================
    // BORROW & RETURN WORKFLOWS
    // =========================================================================

    @PostMapping("/borrow")
    public ResponseEntity<Loan> borrowBook(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        String isbn = body.get("isbn");
        Loan loan = libraryService.borrowBook(memberId, isbn);
        return ResponseEntity.ok(loan);
    }

    @PostMapping("/return/{loanId}")
    public ResponseEntity<Loan> returnBook(@PathVariable String loanId) {
        Loan loan = libraryService.returnBook(loanId);
        return ResponseEntity.ok(loan);
    }

    @GetMapping("/members/{memberId}/loans/active")
    public ResponseEntity<List<Loan>> getActiveLoans(@PathVariable String memberId) {
        return ResponseEntity.ok(libraryService.getActiveLoansForMember(memberId));
    }

    @GetMapping("/members/{memberId}/loans/history")
    public ResponseEntity<List<Loan>> getLoanHistory(@PathVariable String memberId) {
        return ResponseEntity.ok(libraryService.getLoanHistoryForMember(memberId));
    }

    @GetMapping("/members/{memberId}/notifications")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable String memberId) {
        return ResponseEntity.ok(libraryService.getNotificationsForMember(memberId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        libraryService.simReset();
        return ResponseEntity.ok(libraryService.getSimSnapshots());
    }

    @PostMapping("/sim/borrow")
    public ResponseEntity<Map<String, Object>> simBorrow(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        String isbn = body.get("isbn");
        return ResponseEntity.ok(libraryService.simBorrow(memberId, isbn));
    }

    @PostMapping("/sim/return/{loanId}")
    public ResponseEntity<Map<String, Object>> simReturn(@PathVariable String loanId) {
        return ResponseEntity.ok(libraryService.simReturn(loanId));
    }

    @PostMapping("/sim/sweep")
    public ResponseEntity<Map<String, Object>> simSweep(@RequestBody(required = false) Map<String, Boolean> body) {
        boolean makeOverdue = body != null && Boolean.TRUE.equals(body.get("makeOverdue"));
        return ResponseEntity.ok(libraryService.simTriggerSweep(makeOverdue));
    }

    @GetMapping("/sim/snapshots")
    public ResponseEntity<Map<String, Object>> simGetSnapshots() {
        return ResponseEntity.ok(libraryService.getSimSnapshots());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(libraryService.getSimEvents());
    }
}

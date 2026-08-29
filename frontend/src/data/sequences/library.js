// Sequence diagram content for library.
// Grounded directly in LibraryService, fine calculation strategy,
// book copy availability, and reservation queue.
export default {
  title: 'Library Management — Book Checkout, Reservation Queue & Overdue Fine Strategy',
  description:
    'How LibraryService manages book copy borrowing and returns. Book loans check active member borrow limits, place members on a reservation FIFO queue when copies are fully checked out, and calculate overdue late fines using FineCalculationStrategy.',
  flows: [
    {
      id: 'book-checkout-and-return',
      label: 'Book checkout under quota → Overdue return with late fine calculation',
      description:
        'Member Alice borrows "Clean Code" (BK-101-C1). 21 days later (7 days overdue on a 14-day policy), Alice returns the book. LibraryService invokes FineCalculationStrategy to compute ₹70.00 fine and alerts the next waiting member on the reservation queue.',
      participants: [
        { id: 'member', name: 'Member\n(Alice)', kind: 'actor' },
        { id: 'controller', name: 'Library\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'LibraryService', kind: 'component', stereotype: 'facade' },
        { id: 'fineStrategy', name: 'FineCalculation\nStrategy', kind: 'component', stereotype: 'strategy' },
        { id: 'repo', name: 'Library\nRepository', kind: 'store' },
      ],
      steps: [
        { from: 'member', to: 'controller', text: 'POST /api/library/books/BK-101/borrow {memberId: "alice", copyId: "C1"}' },
        { from: 'controller', to: 'service', text: 'borrowBook("alice", "BK-101", "C1")', activate: 'service' },
        { from: 'service', to: 'repo', text: 'getMember("alice") ; getActiveLoans("alice")' },
        { from: 'repo', to: 'service', text: 'Member {loans: 2, maxAllowed: 5} — within limit ✓', type: 'return' },
        { from: 'service', to: 'repo', text: 'getBookCopy("BK-101-C1") → AVAILABLE' },
        { from: 'service', to: 'repo', text: 'createLoan(Loan {id: "LN-501", due: now+14days}) ; markCopyIssued("BK-101-C1")' },
        { from: 'service', to: 'controller', text: 'return Loan LN-501', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'member', text: '200 OK — Book issued (Due in 14 days)', type: 'return' },
        { from: 'member', to: 'controller', text: 'POST /api/library/loans/LN-501/return' },
        { from: 'controller', to: 'service', text: 'returnBook("LN-501")', activate: 'service' },
        { from: 'service', to: 'repo', text: 'getLoan("LN-501") → daysOverdue = 7' },
        { from: 'service', to: 'fineStrategy', text: 'calculateFine(daysOverdue=7, bookType=STANDARD)', activate: 'fineStrategy' },
        { from: 'fineStrategy', to: 'service', text: 'return fineAmount = ₹70.00 (7 * ₹10/day)', type: 'return', deactivate: 'fineStrategy' },
        { from: 'service', to: 'repo', text: 'closeLoan("LN-501", fine=70.0) ; markCopyAvailable("BK-101-C1")' },
        { from: 'service', to: 'repo', text: 'checkReservationQueue("BK-101") → notify next member' },
        { from: 'service', to: 'controller', text: 'return ReturnSummary {loanId: "LN-501", overdueDays: 7, fine: ₹70.00}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'member', text: '200 OK — Book returned. Late fine: ₹70.00', type: 'return' },
      ],
    },
  ],
};

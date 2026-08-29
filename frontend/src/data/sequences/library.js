// Sequence diagram content for library.
// Grounded directly in LibraryService#borrowBook / #returnBook, StandardFineStrategy, and
// DueDateNotifier — corrected after an earlier version invented a FineCalculationStrategy class,
// a reservation queue, and a copyId-scoped borrow endpoint that don't exist in this module's
// actual code (see RCA note in HANDOFF.md on the sequences bulk-add incident).
export default {
  title: 'Library — Last-Copy Contention (Two-Lock Borrow) & Overdue Fine on Return',
  description:
    'How LibraryService#borrowBook guards two different invariants with two different locks: a per-member lock for the borrow-limit quota, then a per-book lock for copy assignment — with a compensating decrement if the book turns out to have no copy left by the time the book lock is acquired. #returnBook mirrors the same two locks in reverse and, if the return is late, delegates the fine amount to whichever FineStrategy is wired in (StandardFineStrategy: ₹5/day past the due date) rather than computing it inline.',
  flows: [
    {
      id: 'last-copy-contention-and-overdue-return',
      label: 'Two members race for the last copy → the loser is rejected; the winner returns it late',
      description:
        '"Clean Code" (ISBN CC-001) has exactly one copy left. Alice and Bob both call borrowBook("CC-001") around the same moment. Alice\'s request passes her own member-quota check first and reaches the book lock first, claiming the last copy. Bob\'s member-quota check also passes (his active-loan count is independently fine), but by the time he reaches the book lock, findAvailableCopy() returns null — LibraryService compensates by decrementing the loan count it had just optimistically incremented for him, then throws BookNotAvailableException. Alice returns the book 4 days late; StandardFineStrategy computes ₹20 (4 × ₹5/day) and DueDateNotifier fans the fine out to observers.',
      participants: [
        { id: 'alice', name: 'Alice', kind: 'actor' },
        { id: 'bob', name: 'Bob', kind: 'actor' },
        { id: 'controller', name: 'LibraryController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'LibraryService', kind: 'component', stereotype: 'facade' },
        { id: 'memberLock', name: 'member.getLock()', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'bookLock', name: 'bookLocks.get("CC-001")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'fineStrategy', name: 'StandardFineStrategy', kind: 'component', stereotype: 'strategy' },
        { id: 'notifier', name: 'DueDateNotifier', kind: 'component', stereotype: 'observer' },
      ],
      steps: [
        { type: 'note', over: ['bookLock'], text: '"Clean Code" (CC-001) has exactly 1 available copy left.' },
        { from: 'alice', to: 'controller', text: 'POST /api/library/borrow {memberId: "alice", isbn: "CC-001"}' },
        { from: 'controller', to: 'service', text: 'borrowBook("alice", "CC-001")', activate: 'service' },
        { from: 'bob', to: 'controller', text: 'POST /api/library/borrow {memberId: "bob", isbn: "CC-001"}  — arrives ~simultaneously' },
        { from: 'controller', to: 'service', text: 'borrowBook("bob", "CC-001")' },
        { from: 'service', to: 'memberLock', text: '[Alice] member.getLock().lock() — quota check, count 2->3 (max 5)', activate: 'memberLock', deactivate: 'memberLock' },
        { from: 'service', to: 'memberLock', text: '[Bob] member.getLock().lock() — quota check, count 1->2 (max 5) — his OWN lock, unrelated to Alice\'s', activate: 'memberLock', deactivate: 'memberLock' },
        { type: 'note', over: ['service'], text: 'Both quota checks pass independently — they lock different Member objects. The real contention is still ahead, on the shared book lock.' },
        { from: 'service', to: 'bookLock', text: '[Alice] bookLocks.get("CC-001").lock() — ACQUIRED', activate: 'bookLock' },
        { from: 'service', to: 'bookLock', text: '[Bob] bookLocks.get("CC-001").lock() — BLOCKS, Alice holds it' },
        { from: 'service', to: 'service', text: '[Alice] book.findAvailableCopy() -> Copy "CC-001-C1"' },
        { from: 'service', to: 'service', text: '[Alice] copy.setAvailable(false)' },
        { from: 'service', to: 'bookLock', text: '[Alice] bookLocks.get("CC-001").unlock()', deactivate: 'bookLock' },
        { from: 'service', to: 'controller', text: '[Alice] return Loan { id: "LOAN-1", dueDate: +14 days }', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'alice', text: '200 OK — Loan LOAN-1, due in 14 days', type: 'return' },
        { from: 'bookLock', to: 'service', text: '[Bob] lock() finally returns — Bob is now inside', activate: 'bookLock' },
        { from: 'service', to: 'service', text: '[Bob] book.findAvailableCopy() -> null  (no copies left)' },
        { from: 'service', to: 'memberLock', text: '[Bob] COMPENSATE: member.getLock().lock() ; decrementLoanCount() back to 1', activate: 'memberLock', deactivate: 'memberLock' },
        { from: 'service', to: 'bookLock', text: '[Bob] bookLocks.get("CC-001").unlock()', deactivate: 'bookLock' },
        { from: 'service', to: 'controller', text: 'throw BookNotAvailableException("All 1 copies of \'Clean Code\' are currently borrowed.")', type: 'return' },
        { from: 'controller', to: 'bob', text: '409 Conflict — no copies available', type: 'return' },
        { type: 'note', over: ['alice', 'bob'], text: 'Exactly one loan created, no copy double-assigned, and Bob\'s quota increment is cleanly unwound rather than leaking a phantom active loan.' },
        { from: 'alice', to: 'controller', text: 'POST /api/library/return/LOAN-1  — 4 days after the due date' },
        { from: 'controller', to: 'service', text: 'returnBook("LOAN-1")', activate: 'service' },
        { from: 'service', to: 'bookLock', text: 'copy.setAvailable(true)', activate: 'bookLock', deactivate: 'bookLock' },
        { from: 'service', to: 'memberLock', text: 'member.getLock().lock() ; decrementLoanCount()', activate: 'memberLock', deactivate: 'memberLock' },
        { from: 'service', to: 'fineStrategy', text: 'calculateFine(loan, returnDate, alice)', activate: 'fineStrategy' },
        { from: 'fineStrategy', to: 'service', text: 'return ₹20.00  (4 days overdue × ₹5/day)', type: 'return', deactivate: 'fineStrategy' },
        { from: 'service', to: 'notifier', text: 'notifyObservers(alice.id, FINE_LEVIED, "Fine of ₹20.00 accrued...")', activate: 'notifier' },
        { from: 'notifier', to: 'notifier', text: 'fan out to InAppLibraryNotificationObserver + LoggingLibraryNotificationObserver', deactivate: 'notifier' },
        { from: 'service', to: 'controller', text: 'return Loan { status: RETURNED, fineAmount: 20.0 }', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'alice', text: '200 OK — returned, ₹20.00 fine recorded', type: 'return' },
      ],
    },
  ],
};

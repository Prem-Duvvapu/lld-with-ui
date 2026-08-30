// designDetails — library
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Library Management System — Design Details',
  tldr: [
    'Multi-copy library catalog management system with Factory-created typed members (Student, Faculty, General) carrying distinct loan duration and quota policies',
    'Strategy Pattern for overdue fine computation (StandardFineStrategy evaluating daily overdue rates)',
    'Observer Pattern for background due-date reminder and overdue transition event dispatch to member inboxes',
    'Dual-level concurrency locking: per-book ReentrantLocks preventing last-copy borrow races, and per-member mutexes preventing borrow quota oversubscription',
    'Explicit LoanStatus state machine (ACTIVE → RETURNED / OVERDUE) with idempotent return validation'
  ],
  requirements: [
    'Library management system with books, members, and borrow records',
    'Books have states: AVAILABLE, BORROWED, RESERVED — only available books can be borrowed',
    'Members can search books by title, author, or ISBN',
    'Borrowing a book creates a BorrowRecord with borrow date and due date (14 days)',
    'Returning a book checks for overdue — fine is ₹5/day past due date',
    'Members can view their borrowing history with fines',
    'Thread-safe concurrent access — multiple members can borrow/return simultaneously'
  ],
  entities: [
    {
      name: 'Book',
      description: 'Catalog metadata entity aggregating physical BookCopy instances with atomic availability counts.',
      fields: [
        {
          name: 'isbn',
          type: 'String'
        },
        {
          name: 'copies',
          type: 'List<BookCopy>'
        }
      ],
      methods: [
        {
          name: 'findAvailableCopy()',
          returns: 'BookCopy',
          description: 'Returns first free copy'
        }
      ]
    },
    {
      name: 'BookCopy',
      description: 'Physical asset model with unique barcode ID, shelf rack location, and availability state.',
      fields: [
        {
          name: 'copyId',
          type: 'String'
        },
        {
          name: 'isAvailable',
          type: 'boolean'
        }
      ],
      methods: [
        {
          name: 'setAvailable(flag)',
          returns: 'void',
          description: 'Mutates availability'
        }
      ]
    },
    {
      name: 'Member',
      description: 'Library patron entity carrying MemberType, LoanPolicy, active loan counter, and accrued fine balance.',
      fields: [
        {
          name: 'loanPolicy',
          type: 'LoanPolicy'
        },
        {
          name: 'activeLoanCount',
          type: 'AtomicInteger'
        },
        {
          name: 'memberLock',
          type: 'ReentrantLock'
        }
      ],
      methods: [
        {
          name: 'addFine(amount)',
          returns: 'void',
          description: 'Accrues overdue fee'
        }
      ]
    },
    {
      name: 'Loan',
      description: 'Tracks checkout relationship between member and copy with explicit LoanStatus state.',
      fields: [
        {
          name: 'status',
          type: 'LoanStatus'
        },
        {
          name: 'dueDate',
          type: 'LocalDate'
        },
        {
          name: 'fineAmount',
          type: 'double'
        }
      ],
      methods: []
    },
    {
      name: 'LibraryService',
      description: 'Core Spring @Service orchestrating catalog, borrow/return locks, fine strategies, and observers. A legacy manual getInstance() double-checked-locking singleton used to sit alongside the real Spring-managed bean — dead code nothing ever called — and has been removed; Spring already manages this as a singleton the ordinary way.',
      fields: [
        {
          name: 'repository',
          type: 'LibraryRepository',
          description: 'Book/copy/member/loan storage and both id generators, injected via constructor'
        },
        {
          name: 'bookLocks',
          type: 'ConcurrentHashMap<String, ReentrantLock>',
          description: 'Fair per-ISBN lock guarding the find-available-copy-and-assign step; kept in the service, not the repository'
        },
        {
          name: 'fineStrategy',
          type: 'FineStrategy',
          description: 'Computes overdue fines on return'
        },
        {
          name: 'notifier',
          type: 'DueDateNotifier',
          description: 'Fans borrow/return/fine/overdue events out to every registered LibraryNotificationObserver'
        }
      ],
      methods: [
        {
          name: 'borrowBook(memberId, isbn)',
          returns: 'Loan',
          description: 'Locks the member to check+increment their quota, then locks the book to assign a copy — all-or-nothing with a compensating decrement if no copy is free'
        },
        {
          name: 'returnBook(loanId)',
          returns: 'Loan',
          description: 'Marks the loan RETURNED, frees the copy under the book lock, decrements the member\'s count, and applies a fine via FineStrategy if overdue'
        }
      ]
    },
    {
      name: 'LibraryRepository',
      description: 'In-memory catalog/member/loan store. One instance backs the live API; a second, fully independent instance backs /sim/* so the demo can never touch a real book/member/loan.',
      fields: [
        {
          name: 'booksByIsbn, copiesById, membersById, loansById',
          type: 'ConcurrentHashMap<String, ...>',
          description: 'One map per entity type'
        },
        {
          name: 'memberLoans',
          type: 'ConcurrentHashMap<String, List<String>>',
          description: 'A member\'s loan ids in borrow order, for active-loan and history lookups'
        },
        {
          name: 'loanIdGen, memberIdGen',
          type: 'AtomicLong',
          description: 'Monotonic id sequences, both reset together by clear()'
        }
      ],
      methods: [
        {
          name: 'getOrCreateBook(isbn, supplier)',
          returns: 'Book',
          description: 'Atomically reuses the cataloged Book for a repeat addBook call on the same ISBN instead of replacing it'
        },
        {
          name: 'clear()',
          returns: 'void',
          description: 'Resets every map and both id generators — what the /sim/* repository calls on simReset()'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Factory Pattern',
      usage: 'MemberFactory instantiates typed members with associated LoanPolicy constraints.'
    },
    {
      name: 'Strategy Pattern',
      usage: 'FineStrategy interface implemented by StandardFineStrategy for computing overdue debt.'
    },
    {
      name: 'Observer Pattern',
      usage: 'DueDateNotifier publishes reminder and overdue alerts to LibraryNotificationObserver instances.'
    },
    {
      name: 'Singleton Pattern',
      usage: 'LibraryService managed as a thread-safe Spring Singleton.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'LibraryService handles borrowing rules and fine calculation. LibraryRepository manages data persistence. LibraryController maps HTTP requests. Each has one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new book status (LOST, DAMAGED) requires no structural changes. New search criteria can be added without modifying existing filters. The system is open for extension, closed for modification of core borrow/return flow.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Service depends on repository abstraction, not concrete storage. Spring injects the implementation. Switching from in-memory to JPA requires only a new repository implementation.'
    },
    {
      name: 'DRY',
      description: 'Book status validation is centralized in borrowBook() and returnBook(). Search logic is in one stream pipeline. Fine formula is in one place, not duplicated.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Book status is only changed through service methods (borrowBook marks BORROWED, returnBook marks AVAILABLE). External code cannot directly mutate book state.',
      alternative: 'Could use public setters. Controlled mutation via service is chosen because it enforces business rules (can only borrow available books).'
    },
    {
      name: 'Association',
      description: 'BorrowRecord associates Book with Member through bookId and memberId fields. This links the two entities without tight coupling.',
      alternative: 'Could use direct object references (Book book field). Using IDs is chosen because it avoids circular references and simplifies serialization.'
    }
  ],
  extensibility: [
    {
      area: 'Book Reservations',
      description: 'Add a reservation queue. When a BORROWED book is returned, the next member in queue gets notified. Add Reservation entity + holdBook() and releaseHold() methods.',
      difficulty: 'Medium'
    },
    {
      area: 'Different Fine Policies',
      description: 'Implement FineStrategy interface with StandardFine, StudentFine, MaxCapFine. Inject into LibraryService. No changes to borrow/return flow.',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Create JpaLibraryRepository implementing the same interface. Swap via @Profile or @Primary. No service changes needed.',
      difficulty: 'Medium'
    },
    {
      area: 'Book Categories/Tags',
      description: 'Add categories and tags to Book. Add filtering by category in search. Extend existing search infrastructure.',
      difficulty: 'Easy'
    },
    {
      area: 'Late Notifications',
      description: 'Add NotificationService (Email, SMS). Call sendOverdueNotice(member) during returnBook() or via a scheduled job that scans for overdue books.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Used per-book ReentrantLocks instead of a global catalog lock to allow high concurrent borrow throughput across distinct titles.',
    'Adopted Factory Pattern with LoanPolicy value objects to encapsulate quota limits cleanly without subclassing Member.',
    'Employed CopyOnWriteArrayList for observer dispatch and active loan lists to ensure lock-free read operations.'
  ],
  solid: [
    {
      principle: 'Single Responsibility Principle',
      details: 'Book manages copy aggregation; Member tracks quota and debt; FineStrategy computes late fees.'
    },
    {
      principle: 'Open/Closed Principle',
      details: 'New member types with custom loan policies and alternative fine strategies can be added without altering LibraryService.'
    }
  ]
};

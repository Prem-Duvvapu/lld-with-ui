// classDiagrams — library
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Library Management System — Class Diagram',
  classes: [
    {
      name: 'LibraryService',
      stereotype: 'singleton',
      fields: [
        '- instance: volatile LibraryService',
        '- booksByIsbn: ConcurrentHashMap<String, Book>',
        '- copiesById: ConcurrentHashMap<String, BookCopy>',
        '- membersById: ConcurrentHashMap<String, Member>',
        '- loansById: ConcurrentHashMap<String, Loan>',
        '- memberLoans: ConcurrentHashMap<String, List<String>>',
        '- bookLocks: ConcurrentHashMap<String, ReentrantLock>',
        '- loanIdGen: AtomicLong',
        '- fineStrategy: FineStrategy',
        '- notifier: DueDateNotifier'
      ],
      methods: [
        '+ getInstance(): LibraryService',
        '+ addBook(isbn, title, author, category, copies): Book',
        '+ addBookCopy(isbn, rackLocation): BookCopy',
        '+ registerMember(name, email, type): Member',
        '+ searchBooks(query): List<Book>',
        '+ borrowBook(memberId, isbn): Loan',
        '+ returnBook(loanId): Loan',
        '+ payFine(memberId, amount): void',
        '+ getActiveLoansForMember(memberId): List<Loan>',
        '+ scheduledDueDateSweep(): void',
      ]
    },
    {
      name: 'Book',
      stereotype: 'entity',
      fields: [
        '- isbn: String',
        '- title: String',
        '- author: String',
        '- category: String',
        '- copies: CopyOnWriteArrayList<BookCopy>'
      ],
      methods: [
        '+ addCopy(copy): void',
        '+ getTotalCopies(): int',
        '+ getAvailableCopiesCount(): int'
      ]
    },
    {
      name: 'BookCopy',
      stereotype: 'entity',
      fields: [
        '- copyId: String',
        '- isbn: String',
        '- rackLocation: String',
        '- isAvailable: volatile boolean'
      ],
      methods: [
        '+ isAvailable(): boolean',
        '+ setAvailable(available): void'
      ]
    },
    {
      name: 'Member',
      stereotype: 'entity',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- type: MemberType',
        '- loanPolicy: LoanPolicy',
        '- activeLoanCount: AtomicInteger',
        '- accruedFineBalance: volatile double',
        '- memberLock: ReentrantLock(fair)'
      ],
      methods: [
        '+ getLoanPolicy(): LoanPolicy',
        '+ getMemberLock(): ReentrantLock',
        '+ getActiveLoanCount(): AtomicInteger'
      ]
    },
    {
      name: 'LoanPolicy',
      stereotype: 'model',
      fields: [
        '- maxBooksAllowed: int',
        '- loanDurationDays: int'
      ],
      methods: [
        '+ getMaxBooksAllowed(): int',
        '+ getLoanDurationDays(): int'
      ]
    },
    {
      name: 'Loan',
      stereotype: 'entity',
      fields: [
        '- loanId: String',
        '- copyId: String',
        '- isbn: String',
        '- memberId: String',
        '- issueDate: LocalDate',
        '- dueDate: LocalDate',
        '- returnDate: volatile LocalDate',
        '- status: volatile LoanStatus',
        '- fineAmount: volatile double'
      ],
      methods: [
        '+ getStatus(): LoanStatus',
        '+ setStatus(status): void',
        '+ setFineAmount(amount): void'
      ]
    },
    {
      name: 'MemberFactory',
      stereotype: 'factory',
      fields: [],
      methods: [
        '+ getPolicyForType(type): LoanPolicy',
        '+ createMember(id, name, email, type): Member'
      ]
    },
    {
      name: 'FineStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateFine(loan, returnDate, member): double'
      ]
    },
    {
      name: 'StandardFineStrategy',
      fields: [
        '- dailyFineRate: double'
      ],
      methods: [
        '+ calculateFine(loan, returnDate, member): double',
        '+ getDailyFineRate(): double'
      ]
    },
    {
      name: 'DueDateNotifier',
      fields: [
        '- observers: CopyOnWriteArrayList<LibraryNotificationObserver>'
      ],
      methods: [
        '+ registerObserver(observer): void',
        '+ removeObserver(observer): void',
        '+ notifyObservers(memberId, type, message, refId): void'
      ]
    },
    {
      name: 'LibraryNotificationObserver',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onNotification(memberId, type, message, refId): void'
      ]
    },
    {
      name: 'InAppLibraryNotificationObserver',
      fields: [
        '- memberNotifications: ConcurrentHashMap<String, List<Notification>>'
      ],
      methods: [
        '+ onNotification(memberId, type, message, refId): void',
        '+ getNotificationsForMember(memberId): List<Notification>'
      ]
    },
    {
      name: 'LoggingLibraryNotificationObserver',
      fields: [],
      methods: [
        '+ onNotification(memberId, type, message, refId): void'
      ]
    },
    {
      name: 'Notification',
      stereotype: 'model',
      fields: [
        '- id: String',
        '- memberId: String',
        '- type: NotificationType',
        '- message: String',
        '- referenceId: String',
        '- timestamp: Instant'
      ],
      methods: []
    },
    {
      name: 'MemberType',
      stereotype: 'enum',
      fields: [
        'STUDENT (3 books / 14 days)',
        'FACULTY (10 books / 30 days)',
        'GENERAL (5 books / 21 days)'
      ],
      methods: []
    },
    {
      name: 'LoanStatus',
      stereotype: 'enum',
      fields: [
        'ACTIVE',
        'RETURNED',
        'OVERDUE'
      ],
      methods: []
    },
    {
      name: 'NotificationType',
      stereotype: 'enum',
      fields: [
        'DUE_DATE_REMINDER',
        'BOOK_OVERDUE',
        'BOOK_BORROWED',
        'BOOK_RETURNED',
        'FINE_LEVIED'
      ],
      methods: []
    },
  ],
  relationships: [
    { from: 'LibraryService', to: 'Book', label: 'manages' },
    { from: 'LibraryService', to: 'Member', label: 'manages' },
    { from: 'LibraryService', to: 'Loan', label: 'manages' },
    { from: 'LibraryService', to: 'FineStrategy', label: 'uses' },
    { from: 'LibraryService', to: 'DueDateNotifier', label: 'notifies via' },
    { from: 'LibraryService', to: 'MemberFactory', label: 'creates via' },
    { from: 'Book', to: 'BookCopy', label: '1..* copies' },
    { from: 'Member', to: 'LoanPolicy', label: 'has' },
    { from: 'Member', to: 'MemberType', label: 'typed by' },
    { from: 'MemberFactory', to: 'Member', label: 'creates' },
    { from: 'MemberFactory', to: 'LoanPolicy', label: 'resolves' },
    { from: 'Loan', to: 'LoanStatus', label: 'state' },
    { from: 'Loan', to: 'BookCopy', label: 'borrows' },
    { from: 'StandardFineStrategy', to: 'FineStrategy', label: 'implements' },
    { from: 'StandardFineStrategy', to: 'Loan', label: 'fines' },
    { from: 'DueDateNotifier', to: 'LibraryNotificationObserver', label: 'broadcasts to' },
    { from: 'InAppLibraryNotificationObserver', to: 'LibraryNotificationObserver', label: 'implements' },
    { from: 'LoggingLibraryNotificationObserver', to: 'LibraryNotificationObserver', label: 'implements' },
    { from: 'InAppLibraryNotificationObserver', to: 'Notification', label: 'stores' },
    { from: 'Notification', to: 'NotificationType', label: 'typed by' }
  ]
};

const designDetails = {
  parking: {
    title: 'Parking Lot — Design Details',
    requirements: [
      'Multi-floor parking lot with 3 types of spots: CAR (12), BIKE (12), TRUCK (6) — 30 spots total across 3 floors',
      'Multiple gates: G1/G2 (Entry), G3/G4 (Exit) — vehicles can only enter through entry gates and exit through exit gates',
      'Vehicle entry: driver enters through an entry gate → system finds nearest available spot matching vehicle type → creates ticket with spot assignment',
      'Vehicle exit: driver goes to an exit gate → provides ticket → system calculates charges based on duration (min 1hr) → releases the spot',
      'Pricing: CAR ₹20/hr, BIKE ₹10/hr, TRUCK ₹40/hr — minimum 1-hour charge always applies',
      'Real-time spot availability tracking via concurrent-safe data structures',
      'Active ticket monitoring — see all vehicles currently parked with their duration',
      'Thread-safe concurrent access — multiple vehicles can enter/exit simultaneously without data corruption',
    ],
    entities: [
      {
        name: 'ParkingLotService',
        description: 'Core business logic layer. Handles entry (assign spot + create ticket) and exit (calculate amount + release spot). All operations validate gate types and check spot availability.',
        fields: [
          { name: 'HOURLY_RATE_CAR', type: 'double', value: '20.0', description: 'Per-hour charge for cars' },
          { name: 'HOURLY_RATE_BIKE', type: 'double', value: '10.0', description: 'Per-hour charge for bikes' },
          { name: 'HOURLY_RATE_TRUCK', type: 'double', value: '40.0', description: 'Per-hour charge for trucks' },
          { name: 'repository', type: 'ParkingLotRepository', description: 'Data access layer injected via constructor' },
        ],
        methods: [
          { name: 'entry(gateId, vehicleNumber, vehicleType)', returns: 'Ticket', description: 'Validates gate → finds spot → generates ticket → saves → returns ticket' },
          { name: 'exit(gateId, ticketNumber)', returns: 'Ticket', description: 'Validates gate & ticket → calculates hours → computes amount → releases spot → returns receipt' },
          { name: 'getGates()', returns: 'List<Gate>', description: 'Returns all configured gates' },
          { name: 'getFloors()', returns: 'List<Floor>', description: 'Returns all floors with their spots' },
          { name: 'getActiveTickets()', returns: 'List<Ticket>', description: 'Returns all tickets with no exit time' },
        ],
      },
      {
        name: 'ParkingLotRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock for thread safety. Acts as the single source of truth for all parking lot state.',
        fields: [
          { name: 'floors', type: 'Map<String, Floor>', description: 'LinkedHashMap — preserves insertion order of floors' },
          { name: 'spots', type: 'ConcurrentHashMap<String, ParkingSpot>', description: 'All spots indexed by ID for O(1) lookup' },
          { name: 'tickets', type: 'ConcurrentHashMap<String, Ticket>', description: 'All tickets indexed by ticket number' },
          { name: 'gates', type: 'Map<String, Gate>', description: 'All gates indexed by gate ID' },
          { name: 'spotLock', type: 'ReentrantLock', description: 'Ensures atomic spot occupy/release operations' },
          { name: 'ticketLock', type: 'ReentrantLock', description: 'Ensures unique ticket number generation' },
        ],
        methods: [
          { name: 'occupySpot(vehicleType)', returns: 'ParkingSpot', description: 'Finds & marks first available spot of given type — thread safe via ReentrantLock' },
          { name: 'releaseSpot(spotId)', returns: 'void', description: 'Marks spot as available — thread safe via ReentrantLock' },
          { name: 'generateTicketNumber()', returns: 'String', description: 'Atomic counter — produces "TKT-00001" format' },
          { name: 'getActiveTickets()', returns: 'List<Ticket>', description: 'Filters tickets where exitTime == null, sorted newest first' },
        ],
      },
      {
        name: 'Ticket',
        description: 'Value object representing a parking session. Created on entry, finalized on exit with amount calculation.',
        fields: [
          { name: 'ticketNumber', type: 'String', description: 'Unique identifier (auto-generated), e.g. TKT-00001' },
          { name: 'vehicleNumber', type: 'String', description: 'License plate of the vehicle, e.g. KA-01-AB-1234' },
          { name: 'vehicleType', type: 'VehicleType', description: 'CAR, BIKE, or TRUCK — determines pricing rate' },
          { name: 'spotId', type: 'String', description: 'Assigned parking spot ID, e.g. F1-C2' },
          { name: 'entryTime', type: 'LocalDateTime', description: 'Timestamp when vehicle entered' },
          { name: 'exitTime', type: 'LocalDateTime', description: 'Timestamp when vehicle exited (null while active)' },
          { name: 'amount', type: 'double', description: 'Calculated charge (0.0 while active, set on exit)' },
        ],
        methods: [],
      },
      {
        name: 'ParkingSpot',
        description: 'Represents a single parking spot with its type, location, and occupancy status.',
        fields: [
          { name: 'id', type: 'String', description: 'Format: F{floor}-{type}{number}, e.g. F1-C2 (Floor 1, Car spot #2)' },
          { name: 'floorNumber', type: 'int', description: 'Which floor this spot belongs to (1-3)' },
          { name: 'spotNumber', type: 'int', description: 'Sequential number within the vehicle type on that floor' },
          { name: 'vehicleType', type: 'VehicleType', description: 'What type of vehicle can park here (CAR/BIKE/TRUCK)' },
          { name: 'occupied', type: 'boolean', description: 'Whether the spot is currently taken' },
        ],
        methods: [
          { name: 'setOccupied(boolean)', returns: 'void', description: 'Toggles spot availability status' },
        ],
      },
      {
        name: 'Floor',
        description: 'Groups parking spots by floor level. Each floor has an independent list of spots.',
        fields: [
          { name: 'floorNumber', type: 'int', description: 'Floor identifier (1, 2, or 3)' },
          { name: 'spots', type: 'List<ParkingSpot>', description: 'All 10 spots on this floor (4 CAR + 4 BIKE + 2 TRUCK)' },
        ],
        methods: [],
      },
      {
        name: 'Gate',
        description: 'Entry or exit point with a type constraint. Vehicles can only enter through ENTRY gates and exit through EXIT gates.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique gate identifier (G1, G2, G3, G4)' },
          { name: 'name', type: 'String', description: 'Human-readable name (Main Entry, Side Entry, etc.)' },
          { name: 'type', type: 'GateType (ENUM)', description: 'ENTRY or EXIT — determines allowed operation' },
        ],
        methods: [],
      },
      {
        name: 'VehicleType',
        description: 'Enum defining supported vehicle categories. Each type maps to a spot type and pricing rate.',
        fields: [
          { name: 'CAR', type: 'enum constant', description: 'Standard car/SUV — ₹20/hr, parks in CAR spots' },
          { name: 'BIKE', type: 'enum constant', description: 'Motorcycle/scooter — ₹10/hr, parks in BIKE spots' },
          { name: 'TRUCK', type: 'enum constant', description: 'Truck/heavy vehicle — ₹40/hr, parks in TRUCK spots' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'ParkingLotRepository abstracts all data access away from the service layer. The service never touches maps or locks directly — it calls semantic methods like occupySpot() and releaseSpot(). This keeps the service focused on business logic and makes the data layer independently testable.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Each Spring @Service and @Repository is a singleton by default. This ensures a single consistent state across all requests — critical since the entire parking lot state lives in memory. Without singleton scope, each request would get a new instance with empty data.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'Services receive their dependencies via constructor injection (Spring auto-wires ParkingLotRepository into ParkingLotService). This decouples class creation from class usage, making the system testable — tests can inject mock repositories without Spring.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Currently pricing is done via a simple switch statement on VehicleType. For a more extensible system, a PricingStrategy interface with implementations like HourlyPricing, DailyPricing, DynamicPricing would allow adding new pricing models without changing the service code (Open/Closed principle).',
      },
      {
        name: 'Observer Pattern',
        used: false,
        explanation: 'The frontend polls /floors and /tickets/active every 5 seconds instead of receiving push updates. A WebSocket-based observer pattern would provide real-time updates without polling, but polling keeps the frontend simpler and avoids WebSocket complexity for a demo.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'Each class has exactly one reason to change. ParkingLotService handles business logic (entry/exit rules, pricing). ParkingLotRepository handles data storage and retrieval. ParkingLotController handles HTTP mapping. Changes to pricing don\'t affect data storage, and vice versa.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new vehicle type requires only adding an enum constant and updating the switch statement — no structural changes. The system is open for extension (new types, new pricing) but closed for modification of core entry/exit flow. The Repository Pattern also allows swapping storage without modifying the service.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'High-level ParkingLotService depends on the ParkingLotRepository abstraction, not on concrete storage details. Spring injects the concrete repository at runtime. This allows switching from in-memory to database storage by implementing the same repository interface without changing business logic.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Gate validation logic is centralized in the service (getGate() + type check), not duplicated per endpoint. Spot occupancy logic is in repository.ocurrentSpot() and releaseSpot(), not scattered. Pricing rates are constants in one place, not magic numbers.',
      },
      {
        name: 'Encapsulation',
        description: 'All fields are private with getter/setter methods. The repository\'s internal maps are never exposed directly — only queried through controlled methods. The ticket\'s amount is only set by the service during exit, not mutable by external code.',
      },
    ],
    oopConcepts: [
      {
        name: 'Polymorphism — Enum-based Type Dispatch',
        description: 'VehicleType enum (CAR/BIKE/TRUCK) drives both spot selection (which spots to search) and pricing (which rate to apply). The same code path handles all types via the enum value, without if-else chains.',
        alternative: 'Could use class hierarchy (Car extends Vehicle, Bike extends Vehicle) with getRate() method. Enum is chosen because vehicle types are fixed, finite, and don\'t have behavioral differences beyond rate/spot mapping. Enums are simpler, immutable, and switch-friendly.',
      },
      {
        name: 'Encapsulation — Data Hiding',
        description: 'Every class hides its internal state. ParkingLotRepository wraps ConcurrentHashMap behind semantic methods. ParkingSpot encapsulates occupancy with a setter that can add validation. Ticket prevents direct amount mutation from outside the service.',
        alternative: 'Could use public fields for simplicity (like a C struct). Encapsulation is chosen because it provides a controlled interface — the repository can add locks, validation, or logging without changing callers.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Floor contains a List of ParkingSpot (composition), not extends SpotCollection. ParkingLotRepository doesn\'t extend a base repository — it composes maps. Services delegate to repositories rather than inheriting data access.',
        alternative: 'Could use inheritance (Floor extends SpotCollection). Composition is chosen because it\'s more flexible — Floors can change their spot collection strategy (array, list, map) without changing the Floor class hierarchy.',
      },
      {
        name: 'Immutable Objects (Value Objects)',
        description: 'Ticket, Gate, Floor, and ParkingSpot are primarily value objects with most fields set at construction and only specific fields mutable (occupied, exitTime, amount). This reduces unexpected state changes.',
        alternative: 'Could make all fields mutable with setters. Limited mutability is chosen because it makes the data flow explicit — you can trace exactly where state changes happen (service.entry, service.exit) rather than mutations being scattered across code.',
      },
    ],
    extensibility: [
      {
        area: 'New Vehicle Types',
        description: 'Add a new constant to VehicleType enum, define spot count in ParkingLotInitializer, add rate constant in ParkingLotService, and add a new field in the frontend EntryForm vehicle type selector.',
        difficulty: 'Easy',
      },
      {
        area: 'Dynamic Pricing',
        description: 'Replace the switch statement with a PricingStrategy interface. Implementations: HourlyStrategy (current), DailyStrategy, WeekendStrategy, SurgeStrategy. The service delegates pricing to the strategy, making it trivial to add new pricing models.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement a JpaParkingLotRepository that implements the same interface as ParkingLotRepository. Swap via Spring @Profile or @Primary. No changes needed in the service layer due to Dependency Injection.',
        difficulty: 'Medium',
      },
      {
        area: 'Reservation System',
        description: 'Add Reservation entity with time slot, add reserve() method to service. On entry, check for reservation instead of assigning any spot. Extends the existing flow without breaking entry/exit.',
        difficulty: 'Medium',
      },
      {
        area: 'Payment Gateway',
        description: 'Add PaymentService interface (Razorpay, Stripe, etc.). Call payment.process(amount) during exit before releasing the spot. The existing amount calculation remains unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'VIP / Reserved Spots',
        description: 'Add an isReserved flag to ParkingSpot. Modify occupySpot() to prefer unreserved spots first. Add reserveSpot() method. Frontend shows reserved spots differently.',
        difficulty: 'Easy',
      },
      {
        area: 'Analytics Dashboard',
        description: 'Add ParkingLotAnalyticsService that uses the existing repository methods to compute: peak hours, revenue reports, occupancy trends, average stay duration. No changes to core entry/exit flow.',
        difficulty: 'Medium',
      },
      {
        area: 'Multiple Parking Lots',
        description: 'Add ParkingLot entity with its own floors/spots/gates. Modify service to take parkingLotId parameter. Repository becomes a multi-lot store. Frontend adds lot selector.',
        difficulty: 'Hard',
      },
    ],
  },

  library: {
    title: 'Library — Design Details',
    requirements: [
      'Library management system with books, members, and borrow records',
      'Books have states: AVAILABLE, BORROWED, RESERVED — only available books can be borrowed',
      'Members can search books by title, author, or ISBN',
      'Borrowing a book creates a BorrowRecord with borrow date and due date (14 days)',
      'Returning a book checks for overdue — fine is ₹5/day past due date',
      'Members can view their borrowing history with fines',
      'Thread-safe concurrent access — multiple members can borrow/return simultaneously',
    ],
    entities: [
      {
        name: 'LibraryService',
        description: 'Core business logic layer. Handles book search, borrow, return, and member history. Enforces business rules: book must be AVAILABLE to borrow, calculates fines on overdue returns.',
        fields: [
          { name: 'repository', type: 'LibraryRepository', description: 'Data access layer injected via constructor' },
          { name: 'FINE_PER_DAY', type: 'double', value: '5.0', description: 'Fine charged per day overdue' },
          { name: 'BORROW_DAYS', type: 'int', value: '14', description: 'Standard borrowing period in days' },
        ],
        methods: [
          { name: 'searchBooks(q)', returns: 'List<Book>', description: 'Search books by title, author, or ISBN (case-insensitive)' },
          { name: 'borrowBook(memberId, bookId)', returns: 'BorrowRecord', description: 'Validates availability → creates record with 14-day due date → marks book BORROWED' },
          { name: 'returnBook(recordId)', returns: 'BorrowRecord', description: 'Marks return date → calculates fine if overdue → marks book AVAILABLE' },
          { name: 'getMemberHistory(memberId)', returns: 'List<BorrowRecord>', description: 'Returns all borrow records for a member, sorted newest first' },
        ],
      },
      {
        name: 'LibraryRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'books', type: 'ConcurrentHashMap<Long, Book>', description: 'All books indexed by ID' },
          { name: 'members', type: 'ConcurrentHashMap<Long, Member>', description: 'All members indexed by ID' },
          { name: 'borrowRecords', type: 'ConcurrentHashMap<Long, BorrowRecord>', description: 'All borrow records indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'searchBooks(q)', returns: 'List<Book>', description: 'Stream-filter search across title, author, ISBN' },
          { name: 'saveBorrowRecord(record)', returns: 'BorrowRecord', description: 'Thread-safe insert into borrowRecords map' },
          { name: 'getMemberHistory(memberId)', returns: 'List<BorrowRecord>', description: 'Filters and sorts records by member' },
        ],
      },
      {
        name: 'Book',
        description: 'Value object representing a library book with its current availability status.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'title', type: 'String', description: 'Book title' },
          { name: 'author', type: 'String', description: 'Book author' },
          { name: 'isbn', type: 'String', description: 'International Standard Book Number' },
          { name: 'status', type: 'String', description: 'AVAILABLE, BORROWED, or RESERVED' },
        ],
        methods: [],
      },
      {
        name: 'Member',
        description: 'Library member with contact info and membership date.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'name', type: 'String', description: 'Member full name' },
          { name: 'email', type: 'String', description: 'Member email address' },
          { name: 'membershipDate', type: 'LocalDate', description: 'When the member joined' },
        ],
        methods: [],
      },
      {
        name: 'BorrowRecord',
        description: 'Tracks a book borrowing session from borrow through return, including any fines.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'bookId', type: 'long', description: 'Which book was borrowed' },
          { name: 'memberId', type: 'long', description: 'Which member borrowed it' },
          { name: 'borrowDate', type: 'LocalDate', description: 'Date the book was checked out' },
          { name: 'dueDate', type: 'LocalDate', description: 'Expected return date (borrow + 14 days)' },
          { name: 'returnDate', type: 'LocalDate', description: 'Actual return date (null while active)' },
          { name: 'fine', type: 'double', description: 'Calculated fine (₹5/day overdue, 0 if on time)' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'LibraryRepository abstracts data access behind semantic methods like searchBooks() and saveBorrowRecord(). The service never touches maps directly — it calls named operations. This keeps business logic clean and enables testing with mock repositories.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring one consistent state across all requests. Critical since all data lives in memory and must be shared across concurrent users.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'LibraryService receives LibraryRepository via constructor injection. Spring auto-wires the dependency, making the service testable without Spring container and allowing repository swaps.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Fine calculation is currently a simple formula (daysOverdue × FINE_PER_DAY). A FineCalculationStrategy interface could support different policies: NoFineForStudents, CapMaxFine, etc.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'LibraryService handles borrowing rules and fine calculation. LibraryRepository manages data persistence. LibraryController maps HTTP requests. Each has one reason to change.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new book status (LOST, DAMAGED) requires no structural changes. New search criteria can be added without modifying existing filters. The system is open for extension, closed for modification of core borrow/return flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not concrete storage. Spring injects the implementation. Switching from in-memory to JPA requires only a new repository implementation.',
      },
      {
        name: 'DRY',
        description: 'Book status validation is centralized in borrowBook() and returnBook(). Search logic is in one stream pipeline. Fine formula is in one place, not duplicated.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation',
        description: 'Book status is only changed through service methods (borrowBook marks BORROWED, returnBook marks AVAILABLE). External code cannot directly mutate book state.',
        alternative: 'Could use public setters. Controlled mutation via service is chosen because it enforces business rules (can only borrow available books).',
      },
      {
        name: 'Association',
        description: 'BorrowRecord associates Book with Member through bookId and memberId fields. This links the two entities without tight coupling.',
        alternative: 'Could use direct object references (Book book field). Using IDs is chosen because it avoids circular references and simplifies serialization.',
      },
    ],
    extensibility: [
      {
        area: 'Book Reservations',
        description: 'Add a reservation queue. When a BORROWED book is returned, the next member in queue gets notified. Add Reservation entity + holdBook() and releaseHold() methods.',
        difficulty: 'Medium',
      },
      {
        area: 'Different Fine Policies',
        description: 'Implement FineStrategy interface with StandardFine, StudentFine, MaxCapFine. Inject into LibraryService. No changes to borrow/return flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Create JpaLibraryRepository implementing the same interface. Swap via @Profile or @Primary. No service changes needed.',
        difficulty: 'Medium',
      },
      {
        area: 'Book Categories/Tags',
        description: 'Add categories and tags to Book. Add filtering by category in search. Extend existing search infrastructure.',
        difficulty: 'Easy',
      },
      {
        area: 'Late Notifications',
        description: 'Add NotificationService (Email, SMS). Call sendOverdueNotice(member) during returnBook() or via a scheduled job that scans for overdue books.',
        difficulty: 'Medium',
      },
    ],
  },

  movieticket: {
    title: 'Movie Ticket Booking — Design Details',
    requirements: [
      'Movie ticket booking system with movies, shows, seats, and bookings',
      'Multiple movies each with multiple shows across different screens and time slots',
      'Seats are categorized as Gold (₹350, rows 1-2) or Silver (₹200, rows 3-4)',
      'Users can browse movies, view show timings, and see seat availability',
      'Booking seats marks them as unavailable and updates available seat count',
      'Cancellation restores seat availability and updates show counts',
      'Thread-safe concurrent access — multiple users can book simultaneously without double-booking',
    ],
    entities: [
      {
        name: 'MovieTicketService',
        description: 'Core business logic for movie browsing and seat booking. Handles seat selection, booking creation, and cancellation with thread-safe operations.',
        fields: [
          { name: 'repository', type: 'MovieTicketRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic booking and cancellation operations' },
        ],
        methods: [
          { name: 'getMovies()', returns: 'List<Movie>', description: 'Returns all movies in the system' },
          { name: 'getShows(movieId)', returns: 'List<Show>', description: 'Returns all shows for a given movie' },
          { name: 'getSeats(showId)', returns: 'List<Seat>', description: 'Returns all seats for a show with availability' },
          { name: 'bookSeats(showId, seatIds, userId)', returns: 'Booking', description: 'Validates and books selected seats — thread safe' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking, restores seats and show availability' },
        ],
      },
      {
        name: 'MovieTicketRepository',
        description: 'In-memory data store with ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'movies', type: 'ConcurrentHashMap<Long, Movie>', description: 'All movies indexed by ID' },
          { name: 'shows', type: 'ConcurrentHashMap<Long, Show>', description: 'All shows indexed by ID' },
          { name: 'seats', type: 'ConcurrentHashMap<Long, Seat>', description: 'All seats indexed by ID' },
          { name: 'bookings', type: 'ConcurrentHashMap<Long, Booking>', description: 'All bookings indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'getMovies()', returns: 'List<Movie>', description: 'Returns all movies' },
          { name: 'getShowsByMovie(movieId)', returns: 'List<Show>', description: 'Filters shows by movie' },
          { name: 'saveBooking(booking)', returns: 'Booking', description: 'Thread-safe booking save' },
        ],
      },
      {
        name: 'Movie',
        description: 'Represents a movie with metadata.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'title', type: 'String', description: 'Movie title' },
          { name: 'genre', type: 'String', description: 'Genre (Sci-Fi, Action, etc.)' },
          { name: 'duration', type: 'int', description: 'Duration in minutes' },
          { name: 'rating', type: 'double', description: 'IMDB-style rating out of 10' },
        ],
        methods: [],
      },
      {
        name: 'Show',
        description: 'A specific screening of a movie at a given time and screen.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'movieId', type: 'long', description: 'Which movie is playing' },
          { name: 'screen', type: 'String', description: 'Screen name (Screen 1, Screen 2, etc.)' },
          { name: 'showTime', type: 'String', description: 'Time of show (10:00 AM, 2:00 PM, etc.)' },
          { name: 'availableSeats', type: 'int', description: 'Currently available seats (decremented on booking)' },
          { name: 'totalSeats', type: 'int', description: 'Total seats (24 per show: 4 rows × 6 cols)' },
        ],
        methods: [],
      },
      {
        name: 'Seat',
        description: 'A single seat in the cinema with type and pricing.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'row', type: 'int', description: 'Row number (1-4)' },
          { name: 'col', type: 'int', description: 'Column number (1-6)' },
          { name: 'type', type: 'String', description: 'Gold (rows 1-2) or Silver (rows 3-4)' },
          { name: 'price', type: 'double', description: 'Gold: ₹350, Silver: ₹200' },
          { name: 'available', type: 'boolean', description: 'Whether the seat is free to book' },
        ],
        methods: [],
      },
      {
        name: 'Booking',
        description: 'A confirmed seat booking with payment details.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'showId', type: 'long', description: 'Which show this booking is for' },
          { name: 'seatIds', type: 'List<Long>', description: 'List of booked seat IDs' },
          { name: 'userId', type: 'String', description: 'Who made the booking' },
          { name: 'status', type: 'String', description: 'BOOKED or CANCELLED' },
          { name: 'totalAmount', type: 'double', description: 'Sum of all booked seat prices' },
          { name: 'bookingTime', type: 'LocalDateTime', description: 'When the booking was made' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'MovieTicketRepository encapsulates all data access. The service calls updateSeat(), saveBooking(), etc. rather than directly manipulating maps. This separates persistence concerns from business logic.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure consistent state across concurrent requests. Critical for preventing double-booking in an in-memory system.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'MovieTicketService receives MovieTicketRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'The bookSeats() method wraps all operations (validate seats → mark unavailable → update show → create booking) in a single ReentrantLock block, ensuring atomicity. If any step fails, no partial state is committed.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'MovieTicketService handles booking business logic (seat validation, pricing). Repository manages all data storage. Controller handles HTTP concerns. Each has a clear, single responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new seat tier (e.g., VIP ₹500) requires only adding the seat type and price — no service changes. New cancellation policies can be added without modifying core booking flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction. Spring injects the concrete implementation. Switching storage (e.g., to Redis) requires only a new repository.',
      },
      {
        name: 'Fail-Fast Validation',
        description: 'Booking validates all seats before marking any as unavailable. If seat #3 is already booked, the entire operation fails before any state change, preventing partial bookings.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation',
        description: 'Seat.available is only modified through service.bookSeats() and cancelBooking(). External code cannot accidentally mark seats available or unavailable.',
        alternative: 'Could expose public setters. Controlled mutation via service prevents double-booking bugs.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Booking contains a list of Seat IDs (composition). Show does not extend Movie — it references a movieId. This avoids deep inheritance hierarchies.',
        alternative: 'Could extend Movie class with Show inheriting. Composition is chosen because a Show is not a type of Movie — it represents a screening event.',
      },
    ],
    extensibility: [
      {
        area: 'Multiple Theaters',
        description: 'Add Theater entity containing screens and shows. Each Theater has its own seat layout. MovieTicketService takes theaterId parameter.',
        difficulty: 'Medium',
      },
      {
        area: 'Food & Beverage Addon',
        description: 'Add FnbItem and FnbOrder entities. Extend Booking with optional food items. Calculate additional amount during booking.',
        difficulty: 'Medium',
      },
      {
        area: 'Loyalty Program',
        description: 'Add User entity with loyalty points. Points earned per booking (₹1 = 1 point). Redeem points for discounts on future bookings.',
        difficulty: 'Easy',
      },
      {
        area: 'Dynamic Seat Pricing',
        description: 'Replace fixed pricing with a PricingStrategy. Peak hours (evening shows) cost more. Weekends have premium pricing.',
        difficulty: 'Medium',
      },
{
        area: 'Multiple Parking Lots',
        description: 'Add ParkingLot entity with its own floors/spots/gates. Modify service to take parkingLotId parameter. Repository becomes a multi-lot store. Frontend adds lot selector.',
        difficulty: 'Hard',
      },
    ],
  },

  chess: {
    title: 'Chess — Design Details',
    requirements: [
      'Two-player chess game with standard 8×8 board and initial piece setup',
      'Full move validation for all piece types: Pawn, Rook, Knight, Bishop, Queen, King',
      'Pawn: moves forward 1 (2 from start), captures diagonally',
      'Rook: horizontal/vertical moves through empty squares',
      'Knight: L-shaped jumps (2+1), ignores pieces in between',
      'Bishop: diagonal moves through empty squares',
      'Queen: combination of rook + bishop moves',
      'King: 1 step any direction, with castling support',
      'Check detection: a king is under attack by an opponent piece',
      'Checkmate detection: in check and no legal move to escape',
      'Stalemate detection: not in check but no legal move available',
      'Cannot make a move that leaves own king in check',
      'Turn-based: White moves first, then alternating',
      'Castling: king moves 2 squares toward rook, rook jumps over',
      'Thread-safe concurrent game state via ReentrantLock',
    ],
    entities: [
      {
        name: 'ChessService',
        description: 'Core chess engine with full move validation, check/checkmate/stalemate detection, and castling support. All game mutations are protected by ReentrantLock.',
        fields: [
          { name: 'repository', type: 'ChessRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe game state mutations' },
        ],
        methods: [
          { name: 'createGame(playerWhite, playerBlack)', returns: 'Game', description: 'Creates new game with initial board setup and two players' },
          { name: 'makeMove(gameId, fromRow, fromCol, toRow, toCol)', returns: 'Game', description: 'Validates and executes a move, detects check/checkmate/stalemate' },
          { name: 'getValidMoves(gameId, row, col)', returns: 'List<int[]>', description: 'Returns all legal destination squares for a piece at given position' },
          { name: 'getGame(gameId)', returns: 'Game', description: 'Returns current game state including board, players, status, and move history' },
        ],
      },
      {
        name: 'Game',
        description: 'Central entity holding all chess game state including the 8×8 board, player info, turn tracking, status, and complete move history.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique game identifier' },
          { name: 'board', type: 'String[8][8]', description: '2D array: piece codes like "wK", "bP", null for empty' },
          { name: 'players', type: 'Player[2]', description: 'Array of two players (White at index 0, Black at index 1)' },
          { name: 'currentPlayerIndex', type: 'int', description: '0 for White, 1 for Black' },
          { name: 'status', type: 'GameStatus', description: 'ACTIVE, CHECK, CHECKMATE, DRAW, STALEMATE, or RESIGNED' },
          { name: 'winner', type: 'String', description: 'Winner name when status is CHECKMATE' },
          { name: 'moveHistory', type: 'List<Move>', description: 'Chronological list of all moves played' },
        ],
        methods: [],
      },
      {
        name: 'Move Validation',
        description: 'Each piece type has specific move validation logic with check-safety post-filtering.',
        fields: [
          { name: 'isValidPawnMove', type: 'method', description: 'Forward 1/2, diagonal capture, no en passant (simplified)' },
          { name: 'isValidRookMove', type: 'method', description: 'Horizontal/vertical until blocked' },
          { name: 'isValidKnightMove', type: 'method', description: '2+1 L-shape, jumps over pieces' },
          { name: 'isValidBishopMove', type: 'method', description: 'Diagonal until blocked' },
          { name: 'isValidQueenMove', type: 'method', description: 'Combination of rook + bishop' },
          { name: 'isValidKingMove', type: 'method', description: '1 step any direction + castling' },
        ],
        methods: [
          { name: 'isInCheckOnBoard(board, color)', returns: 'boolean', description: 'Scans all enemy pieces to see if they attack the king\'s square' },
          { name: 'isSquareAttacked(board, row, col, color)', returns: 'boolean', description: 'Checks if any enemy piece can move to given square' },
          { name: 'isCheckmate(game, color)', returns: 'boolean', description: 'In check + no legal move exists' },
          { name: 'hasLegalMove(game, color)', returns: 'boolean', description: 'Brute-force search: tries every piece on every destination' },
        ],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'ChessRepository abstracts all data access. The service never touches the ConcurrentHashMap directly — it calls semantic methods like save() and get(). This makes the service testable and the data layer swappable.',
      },
      {
        name: 'Singleton Pattern (Spring)',
        used: true,
        explanation: 'All @Service and @Repository beans are Spring singletons. This ensures all HTTP requests share the same in-memory game state, which is essential since there is no database.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'ChessService receives ChessRepository via constructor injection. This decouples creation from usage and enables unit testing with mock repositories.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Currently move validation uses switch/if-else per piece type. A MoveValidator interface with per-piece implementations (PawnValidator, RookValidator, etc.) would better follow Open/Closed and make adding new piece types easier.',
      },
      {
        name: 'Memento Pattern',
        used: false,
        explanation: 'Move history is stored but not used for undo. A proper Memento pattern would allow undoing moves by saving full board snapshots before each move, enabling takeback functionality for casual play.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'ChessService handles business logic (move validation, check detection). ChessRepository handles data storage. Game encapsulates board state. Each class has one clear purpose.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new piece type requires only adding a case in switch statements and implementing its move validation. The core game flow (select piece → validate → execute → check state) remains unchanged.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'ChessService depends on the ChessRepository abstraction, not on ConcurrentHashMap directly. This allows swapping storage strategy (HashMap → DB) without changing service logic.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Board cloning logic is a single cloneBoard() method. Check detection is centralized in isInCheckOnBoard(). Square attack checking is one method reused by all pieces.',
      },
      {
        name: 'Encapsulation',
        description: 'Game board is mutated only through service.makeMove(). The repository\'s internal map is never exposed directly. All model fields are private with getters/setters.',
      },
    ],
    oopConcepts: [
      {
        name: 'Polymorphism — Piece-based Dispatch',
        description: 'Move validation dispatches to piece-specific logic based on the piece type character (K, Q, R, B, N, P). The same makeMove() code path handles all pieces via type dispatch.',
        alternative: 'Could use a Piece interface with an isValidMove() method and concrete classes for each piece type. Switch dispatch is simpler for a fixed set of 6 piece types and avoids class explosion.',
      },
      {
        name: 'Encapsulation — Board State Protection',
        description: 'The board array is never directly exposed for mutation — all changes go through makeMove() which validates, simulates, and checks for check-safety before committing.',
        alternative: 'Could expose board directly for speed. Encapsulation is chosen because it prevents invalid states and makes the mutation path auditable via move history.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Game contains arrays of Players and Moves (composition). Pieces are represented as strings, not a class hierarchy. This keeps the model simple and avoids deep inheritance trees.',
        alternative: 'Could use Piece abstract class with King, Queen, etc. subclasses. String-based pieces are chosen because they are serializable, compact, and avoid class loading overhead for 32 pieces.',
      },
      {
        name: 'Value Objects — Move Records',
        description: 'Each Move is an immutable-ish record of what happened: from/to coordinates, piece moved, piece captured, special flags. This makes the move history self-documenting.',
        alternative: 'Could store moves as simple strings like "e2e4". Structured Move objects are chosen because they support flags (castling, en passant) and are easier to parse on the frontend.',
      },
    ],
    extensibility: [
      {
        area: 'New Piece Types (e.g., Chancellor, Archbishop)',
        description: 'Add piece type to PieceType enum, add validation case in isValidMove() and isSquareAttacked(), add Unicode symbol. Core game flow unchanged.',
        difficulty: 'Easy',
      },
      {
        area: 'En Passant Capture',
        description: 'Track the last pawn double-move in Game state. In pawn validation, check if the target is the en passant square. Remove the captured pawn. Adds ~20 lines.',
        difficulty: 'Medium',
      },
      {
        area: 'Pawn Promotion',
        description: 'When a pawn reaches the last rank, present a choice dialog on the frontend. Backend accepts a promotion piece parameter in makeMove().',
        difficulty: 'Medium',
      },
      {
        area: 'Undo Move',
        description: 'Store board snapshots (Memento pattern) before each move. Add undoMove() that restores the previous snapshot and reverts to the previous player\'s turn.',
        difficulty: 'Medium',
      },
      {
        area: 'AI Opponent (Minimax)',
        description: 'Add ChessAI service with minimax evaluation. Frontend shows AI move option. AI calls makeMove() with the computed best move. No changes to validation logic.',
        difficulty: 'Hard',
      },
      {
        area: 'Game Timer / Clock',
        description: 'Add timestamps to moves. Frontend shows elapsed time per player. Service enforces time control (e.g., 10 min per player). Flags timeout as a loss.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaChessRepository implementing the same interface as ChessRepository. Swap via Spring profile. No service layer changes needed.',
        difficulty: 'Medium',
      },
    ],
  },

  ludo: {
    title: 'Ludo — Design Details',
    requirements: [
      'Four-player Ludo game with colored tokens: RED, GREEN, BLUE, YELLOW',
      'Each player has 4 tokens starting in their home base (position -1)',
      '52-cell circular track (positions 0-51) with 4 entry points at 0, 13, 26, 39',
      'Roll dice (1-6) to move: need a 6 to bring a token out of home',
      'Rolling a 6 grants an extra turn',
      'Captures: landing on an opponent token sends it back home',
      'Safe spots (8 total): opponents cannot capture tokens on safe positions',
      'Token cannot move to a square occupied by another own token',
      'Turn alternates between players; first to get all 4 tokens to the final cell wins',
      'Near win condition: token reaching the final cell before its starting position is marked finished',
      'Thread-safe game state via ReentrantLock',
    ],
    entities: [
      {
        name: 'LudoService',
        description: 'Core game logic for Ludo. Handles dice rolling, token movement, captures, turn management, and win detection. All state mutations are protected by ReentrantLock.',
        fields: [
          { name: 'repository', type: 'LudoRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe game state mutations' },
          { name: 'random', type: 'Random', description: 'Random number generator for dice rolls' },
        ],
        methods: [
          { name: 'createGame(playerNames)', returns: 'Game', description: 'Creates new game with 4 players, 4 tokens each at home' },
          { name: 'rollDice(gameId)', returns: 'Game', description: 'Rolls dice (1-6), auto-advances if only one move available' },
          { name: 'moveToken(gameId, playerIndex, tokenIndex)', returns: 'Game', description: 'Moves selected token by current dice value, handles captures' },
          { name: 'getGame(gameId)', returns: 'Game', description: 'Returns current game state' },
        ],
      },
      {
        name: 'Game',
        description: 'Holds all game state: players, their tokens, current turn, dice value, and win status.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique game identifier' },
          { name: 'players', type: 'List<Player>', description: '4 players with name and color' },
          { name: 'tokens', type: 'List<List<Token>>', description: '4×4 grid: 4 tokens per player' },
          { name: 'currentPlayerIndex', type: 'int', description: 'Whose turn it is (0-3)' },
          { name: 'diceValue', type: 'int', description: 'Last rolled dice value (0 = not rolled)' },
          { name: 'status', type: 'GameStatus', description: 'PLAYING or FINISHED' },
          { name: 'winner', type: 'String', description: 'Winner name when status is FINISHED' },
        ],
        methods: [],
      },
      {
        name: 'Token',
        description: 'Represents a single Ludo token with position tracking and state flags.',
        fields: [
          { name: 'id', type: 'int', description: 'Token index within player set (0-3)' },
          { name: 'color', type: 'String', description: 'Owner color (RED/GREEN/BLUE/YELLOW)' },
          { name: 'position', type: 'int', description: 'Track position. -1 = home, 0-51 = on track' },
          { name: 'isHome', type: 'boolean', description: 'True when token is in home base' },
          { name: 'isFinished', type: 'boolean', description: 'True when token has completed the circuit' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'LudoRepository encapsulates all data access behind semantic methods. The service never touches maps or locks directly, making the data layer independently testable and swappable.',
      },
      {
        name: 'Singleton Pattern (Spring)',
        used: true,
        explanation: '@Service and @Repository beans are Spring singletons, ensuring all requests share the same in-memory game state — critical since there is no database.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'LudoService receives LudoRepository via constructor injection. This decouples class creation from usage, enabling unit testing with mock repositories.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Currently capture and safe-spot logic is inline. A CaptureStrategy interface with implementations (StandardCapture, SafeSpotProtection, HomeBaseImmunity) would make the capture rules configurable.',
      },
      {
        name: 'Observer Pattern',
        used: false,
        explanation: 'The frontend polls for state updates. A WebSocket-based observer would push dice roll results, captures, and win events to all connected clients in real-time.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'LudoService handles dice rolling, token movement, captures, and win detection. LudoRepository handles storage. Game/Token/Player are data models. Each has one reason to change.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new rule variant (e.g., three 6s = penalty) requires only modifying rollDice() and moveToken(). The core game flow (roll → move → check win) stays the same.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'LudoService depends on LudoRepository abstraction, not on ConcurrentHashMap directly. This allows swapping to a database-backed repository without changing service logic.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Capture logic is centralized in captureAtPosition(). Safe spot checking is a single isSafeSpot() method. The 52-cell modulo arithmetic is computed once, not duplicated.',
      },
      {
        name: 'Encapsulation',
        description: 'Token position is only modified through LudoService.moveToken(). The repository\'s internal map is never exposed. Game state transitions (PLAYING → FINISHED) are controlled by the service.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — State Protection',
        description: 'Each token\'s position, home, and finished state are only modified through controlled service methods. The Game object\'s currentPlayerIndex and diceValue ensure turn integrity.',
        alternative: 'Could expose fields directly for performance. Encapsulation ensures that captures, safe spot checks, and turn order are never bypassed.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Game contains Lists of Players and Tokens (composition). Players don\'t extend Token — they own Tokens. This models the real-world relationship correctly.',
        alternative: 'Could make Game extend a Board class. Composition is chosen because a Game has a board, players, and state — it\'s not a specialized kind of board.',
      },
      {
        name: 'Value Objects — Constants',
        description: 'START_POSITIONS, SAFE_SPOTS, and TRACK_SIZE are static constants on the Game class, providing a single source of truth for board geometry.',
        alternative: 'Could use an external configuration file. Constants on Game are chosen because board geometry is fixed and compile-time, not runtime-configurable.',
      },
      {
        name: 'State Pattern — Game Status',
        description: 'GameStatus enum (PLAYING, FINISHED) drives what operations are allowed. When FINISHED, rollDice() and moveToken() reject further moves.',
        alternative: 'Could use a boolean isFinished. Enum is chosen because it naturally extends (WAITING, PLAYING, FINISHED) and is more readable than a boolean.',
      },
    ],
    extensibility: [
      {
        area: 'Special Dice Rules',
        description: 'Implement three-consecutive-6s penalty (return last moved token home). Add "roll again on 6" animation on frontend. Modify rollDice() to track consecutive 6s.',
        difficulty: 'Easy',
      },
      {
        area: 'Home Column / Final Stretch',
        description: 'Add 6-position home column per player. Tokens that complete a full lap enter their home column. Exact dice value needed to reach the center. Modify win condition.',
        difficulty: 'Medium',
      },
      {
        area: 'Online Multiplayer',
        description: 'Add WebSocket support. Each player connects from their own browser. Game waits for 4 players to join before starting. Turns are synchronized via server push.',
        difficulty: 'Hard',
      },
      {
        area: 'Game Lobby / Rooms',
        description: 'Add room codes, join/leave mechanics. LudoRepository becomes multi-game. Service adds joinGame(roomCode, playerName). Frontend shows lobby before game starts.',
        difficulty: 'Medium',
      },
      {
        area: 'Bot Players',
        description: 'Add LudoBot that auto-plays: picks best token to move (prioritize captures, advance furthest, bring new tokens out on 6). Can replace human player slots.',
        difficulty: 'Medium',
      },
      {
        area: 'Board Animations',
        description: 'Frontend improvements: animated token movement along the track, dice roll animation, capture explosion effect, victory confetti. No backend changes needed.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaLudoRepository. Game state serialized as JSON or relational. Swap via Spring profile. Service layer unchanged due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  coffee: {
    title: 'Coffee Machine — Design Details',
    requirements: [
      'Coffee vending machine with 6 ingredients: Coffee Beans, Milk, Water, Sugar, Chocolate, Cream',
      '5 preset beverages: Espresso (₹120), Latte (₹150), Cappuccino (₹160), Mocha (₹180), Americano (₹130)',
      'Each beverage has a recipe specifying exact ingredient quantities needed',
      'Select beverage: checks if all ingredients are sufficient, reserves the selection',
      'Brew: consumes ingredients from inventory, transitions machine through IDLE → BREWING → COMPLETE',
      'Machine status: IDLE (ready), BREWING (in progress), COMPLETE (ready to serve), ERROR (insufficient)',
      'Refill ingredient: restocks any ingredient by specified amount, machine must be IDLE to reset from error',
      'Orders history: tracks all brewing attempts with status (PREPARING/COMPLETED/FAILED)',
      'Thread-safe concurrent access — multiple users can operate without race conditions on ingredient inventory',
    ],
    entities: [
      {
        name: 'CoffeeMachineService',
        description: 'Core business logic layer. Handles menu display, beverage selection with ingredient validation, brewing with inventory consumption, machine status tracking, and ingredient refilling.',
        fields: [
          { name: 'repository', type: 'CoffeeRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe brewing and inventory operations' },
        ],
        methods: [
          { name: 'getMenu()', returns: 'List<Beverage>', description: 'Returns all available beverages with prices and recipes' },
          { name: 'selectBeverage(beverageId)', returns: 'Map', description: 'Checks ingredient levels, reserves beverage for brewing' },
          { name: 'brew(beverageId)', returns: 'Map', description: 'Consumes ingredients, transitions machine through states, creates order' },
          { name: 'getStatus()', returns: 'Map', description: 'Returns machine status, current beverage, and all ingredient levels' },
          { name: 'refillIngredient(ingredient, amount)', returns: 'Map', description: 'Restocks a specific ingredient by given amount' },
        ],
      },
      {
        name: 'CoffeeRepository',
        description: 'In-memory data store using ConcurrentHashMap for beverages and synchronized list for orders. Seeds initial data: 6 ingredients with starting levels and 5 beverages with recipes.',
        fields: [
          { name: 'beverages', type: 'ConcurrentHashMap<Long, Beverage>', description: 'All beverages indexed by ID' },
          { name: 'machine', type: 'CoffeeMachine', description: 'Single machine state with ingredients and status' },
          { name: 'orders', type: 'List<Order>', description: 'Synchronized list of all brewing orders' },
        ],
        methods: [
          { name: 'getBeverages()', returns: 'List<Beverage>', description: 'Returns all beverages' },
          { name: 'getMachine()', returns: 'CoffeeMachine', description: 'Returns the machine state' },
          { name: 'addOrder(order)', returns: 'void', description: 'Thread-safe order storage' },
        ],
      },
      {
        name: 'Beverage',
        description: 'A menu item with its recipe defining ingredient requirements and pricing.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier (1-5)' },
          { name: 'name', type: 'String', description: 'Espresso, Latte, Cappuccino, Mocha, or Americano' },
          { name: 'price', type: 'double', description: 'Price in INR (₹120-₹180)' },
          { name: 'recipe', type: 'Map<Ingredient, Integer>', description: 'Mapping of ingredient → amount needed' },
          { name: 'available', type: 'boolean', description: 'Whether the beverage is on the menu' },
        ],
        methods: [],
      },
      {
        name: 'CoffeeMachine',
        description: 'Singleton-like state object representing the physical coffee machine with its ingredient inventory and operational status.',
        fields: [
          { name: 'id', type: 'long', description: 'Machine identifier' },
          { name: 'status', type: 'String', description: 'IDLE, BREWING, COMPLETE, or ERROR' },
          { name: 'currentBeverage', type: 'String', description: 'Name of currently selected/brewing beverage' },
          { name: 'ingredients', type: 'Map<Ingredient, Integer>', description: 'Current inventory levels (g or ml)' },
        ],
        methods: [],
      },
      {
        name: 'Order',
        description: 'Tracks a brewing attempt from selection through completion.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique order identifier' },
          { name: 'beverageId', type: 'long', description: 'Which beverage was brewed' },
          { name: 'beverageName', type: 'String', description: 'Human-readable beverage name' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the order was created' },
          { name: 'status', type: 'String', description: 'PREPARING, COMPLETED, or FAILED' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'CoffeeRepository abstracts all data access behind semantic methods. The service calls getBeverages(), getMachine(), addOrder() rather than manipulating maps directly. This keeps the service focused on brewing logic.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring a single CoffeeMachine state is shared across all requests. This is critical since the machine has exactly one physical state.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'CoffeeMachineService receives CoffeeRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories and ingredient data.',
      },
      {
        name: 'State Machine Pattern',
        used: true,
        explanation: 'Machine status transitions through a clear lifecycle: IDLE → selected → BREWING → COMPLETE → IDLE (or ERROR → IDLE after reset). The service enforces valid transitions — you cannot brew while already brewing.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'CoffeeMachineService handles brewing business logic (inventory check, consumption, state transitions). CoffeeRepository handles data storage. Beverage/CoffeeMachine/Order are pure data models.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new beverage requires only adding an entry to the repository\'s seed data with a new recipe. The brewing logic remains unchanged. New ingredients can be added to the Ingredient enum without structural changes.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on concrete ConcurrentHashMap. Spring injects the implementation, enabling storage strategy swaps.',
      },
      {
        name: 'Encapsulation',
        description: 'Ingredient inventory is only modified through controlled service methods (brew consumes, refill restocks). Machine status transitions are enforced by service logic, preventing invalid states.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Inventory Protection',
        description: 'Ingredient levels are only modified through brew() and refillIngredient() methods. External code cannot directly add or remove ingredients from the machine, ensuring inventory integrity.',
        alternative: 'Could expose the inventory map directly. Encapsulation prevents accidental inventory corruption and ensures all mutations go through validation.',
      },
      {
        name: 'Enum-based Type Safety',
        description: 'Ingredient is an enum with 6 fixed constants. Recipe maps use Ingredient as keys, providing compile-time safety. Invalid ingredient names cannot accidentally be used.',
        alternative: 'Could use strings for ingredient names. Enum is chosen because it provides type safety, autocomplete, and prevents typos like "coffe" vs "coffee".',
      },
      {
        name: 'Polymorphism — Recipe-based Dispatching',
        description: 'Each beverage has its own recipe map. The same brew() code iterates over the recipe and consumes ingredients, regardless of which beverage is selected.',
        alternative: 'Could have per-beverage subclasses with custom brew() methods. Map-based recipe is more data-driven and makes adding new beverages trivial.',
      },
    ],
    extensibility: [
      {
        area: 'New Beverages',
        description: 'Add a new entry to the repository constructor with ID, name, price, and recipe map. The service code handles it automatically. Frontend just needs to display it.',
        difficulty: 'Easy',
      },
      {
        area: 'Custom Recipe Creator',
        description: 'Add an API endpoint to create custom beverages. Validate ingredient availability. Store custom beverages in a separate map. The existing brew() logic handles any recipe.',
        difficulty: 'Medium',
      },
      {
        area: 'Temperature Control',
        description: 'Add temperature setting per beverage. Machine model gets a heater element. Brew() sets temperature based on beverage type. Frontend shows temperature gauge.',
        difficulty: 'Medium',
      },
      {
        area: 'Payment Integration',
        description: 'Add payment validation before brewing. Machine only brews after payment confirmed. Add coin/bill acceptor simulation. Frontend shows payment UI before brew button.',
        difficulty: 'Medium',
      },
      {
        area: 'Maintenance Alerts',
        description: 'Add threshold warnings when ingredients run low (<20%). Machine automatically switches to ERROR when any ingredient reaches 0. Frontend shows restock alerts.',
        difficulty: 'Easy',
      },
      {
        area: 'Multi-Machine Support',
        description: 'Add Machine entity with ID. Repository manages Map<Long, CoffeeMachine>. Service takes machineId parameter. Frontend adds machine selector.',
        difficulty: 'Hard',
      },
    ],
  },

  wallet: {
    title: 'Digital Wallet — Design Details',
    requirements: [
      'Digital wallet system supporting multiple users with individual wallet accounts',
      'Each wallet has: user ID, user name, balance in INR, creation timestamp',
      'Create wallet: new wallet with ₹0 starting balance and unique ID',
      'Add funds: deposit money via payment methods (UPI, CARD, BANK_TRANSFER, WALLET_BALANCE)',
      'Send money: transfer between wallets with balance validation and minimum amount checks',
      'Transaction history: complete log of all credits, debits, and transfers per wallet',
      'Transactions track: from/to wallet IDs, amount, type (CREDIT/DEBIT/TRANSFER), status (COMPLETED/FAILED), timestamp, description',
      'Thread-safe concurrent access — ReentrantLock prevents race conditions on transfers',
    ],
    entities: [
      {
        name: 'WalletService',
        description: 'Core business logic for wallet operations. Handles wallet creation, fund addition with payment method tracking, peer-to-peer transfers with balance validation, and transaction history retrieval.',
        fields: [
          { name: 'repository', type: 'WalletRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic transfers and balance updates' },
        ],
        methods: [
          { name: 'createWallet(userId, userName)', returns: 'Wallet', description: 'Creates new wallet with ₹0 balance' },
          { name: 'getBalance(walletId)', returns: 'double', description: 'Returns current wallet balance' },
          { name: 'addFunds(walletId, amount, paymentMethod)', returns: 'Map', description: 'Adds money via specified payment method, records credit transaction' },
          { name: 'sendMoney(from, to, amount, description)', returns: 'Map', description: 'Validates balance, debits sender, credits recipient, records transfer' },
          { name: 'getTransactions(walletId)', returns: 'List<Transaction>', description: 'Returns complete transaction history for a wallet' },
        ],
      },
      {
        name: 'WalletRepository',
        description: 'In-memory data store with ConcurrentHashMap. Seeds 3 wallets (Alice: ₹5000, Bob: ₹3000, Charlie: ₹10000). Generates sequential IDs via AtomicLong.',
        fields: [
          { name: 'wallets', type: 'ConcurrentHashMap<Long, Wallet>', description: 'All wallets indexed by ID' },
          { name: 'transactions', type: 'ConcurrentHashMap<Long, List<Transaction>>', description: 'Transactions indexed by wallet ID' },
          { name: 'walletIdGen', type: 'AtomicLong', description: 'Sequential wallet ID generator' },
          { name: 'txnIdGen', type: 'AtomicLong', description: 'Sequential transaction ID generator' },
        ],
        methods: [
          { name: 'findWalletById(id)', returns: 'Wallet', description: 'O(1) wallet lookup' },
          { name: 'saveWallet(wallet)', returns: 'Wallet', description: 'Upserts wallet into map' },
          { name: 'addTransaction(txn)', returns: 'void', description: 'Thread-safe transaction storage per wallet' },
          { name: 'getTransactionsByWalletId(id)', returns: 'List<Transaction>', description: 'Returns transaction list for wallet' },
        ],
      },
      {
        name: 'Wallet',
        description: 'User wallet with balance and metadata. Balance is mutable only through controlled service operations.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique wallet identifier' },
          { name: 'userId', type: 'String', description: 'User\'s unique ID' },
          { name: 'userName', type: 'String', description: 'Display name of the wallet owner' },
          { name: 'balance', type: 'double', description: 'Current wallet balance in INR' },
          { name: 'currency', type: 'String', description: 'Currency code (INR)' },
          { name: 'createdAt', type: 'LocalDateTime', description: 'Timestamp of wallet creation' },
        ],
        methods: [],
      },
      {
        name: 'Transaction',
        description: 'Record of a financial operation affecting one or two wallets.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique transaction ID' },
          { name: 'fromWalletId', type: 'Long', description: 'Source wallet (null for direct credits)' },
          { name: 'toWalletId', type: 'Long', description: 'Destination wallet (null for debits)' },
          { name: 'amount', type: 'double', description: 'Transaction amount' },
          { name: 'type', type: 'String', description: 'CREDIT, DEBIT, or TRANSFER' },
          { name: 'status', type: 'String', description: 'PENDING, COMPLETED, or FAILED' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the transaction occurred' },
          { name: 'description', type: 'String', description: 'User-provided memo or system description' },
        ],
        methods: [],
      },
      {
        name: 'PaymentMethod',
        stereotype: 'enum',
        description: 'Supported payment methods for adding funds to wallets.',
        fields: [
          { name: 'UPI', type: 'enum constant', description: 'Unified Payments Interface — instant bank transfer' },
          { name: 'CARD', type: 'enum constant', description: 'Credit or debit card payment' },
          { name: 'BANK_TRANSFER', type: 'enum constant', description: 'Direct bank account transfer (NEFT/RTGS)' },
          { name: 'WALLET_BALANCE', type: 'enum constant', description: 'Use existing wallet balance (internal)' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'WalletRepository abstracts all data access behind semantic methods. The service calls findWalletById(), saveWallet(), addTransaction() rather than manipulating ConcurrentHashMap directly.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring a single consistent set of wallets and balances across all requests. Critical since all financial state lives in memory.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'WalletService receives WalletRepository via constructor injection. Spring auto-wires, enabling unit testing with mock repositories without needing to start the full Spring context.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'sendMoney() wraps debit and credit in a single ReentrantLock block, ensuring atomicity. If the debit succeeds but the credit fails (impossible with in-memory, but relevant for DB), the entire operation rolls back.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'WalletService handles business logic (balance validation, transfers). WalletRepository handles data persistence. Wallet/Transaction are pure data models. PaymentMethod is an enum type.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new payment method requires only adding an enum constant and updating frontend options. The fund addition logic remains unchanged. New transaction types can be added without structural changes.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on ConcurrentHashMap. This allows swapping to a database-backed repository via Spring configuration without changing service code.',
      },
      {
        name: 'Encapsulation',
        description: 'Wallet balance is only modified through addFunds() and sendMoney() methods. External code cannot directly set wallet balances. Transactions are immutable after creation.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Financial Integrity',
        description: 'Wallet balance has no public setter — only the service can modify it through controlled operations that enforce business rules (sufficient balance for transfers, positive amounts).',
        alternative: 'Could expose setBalance(). Controlled mutation prevents unauthorized balance changes and ensures every balance change is accompanied by a transaction record.',
      },
      {
        name: 'Value Objects — Transaction Records',
        description: 'Transactions are immutable after creation. All fields are set at construction and never modified. This provides a reliable audit trail.',
        alternative: 'Could make transactions mutable. Immutability prevents accidental modification of financial records and makes the history tamper-evident.',
      },
      {
        name: 'Enum-based Type Safety — Payment Methods',
        description: 'PaymentMethod enum provides compile-time safety for supported payment types. New methods can be added without changing method signatures.',
        alternative: 'Could use strings for payment methods. Enum provides autocomplete, prevents typos, and makes the fixed set of options explicit.',
      },
    ],
    extensibility: [
      {
        area: 'Multi-Currency Support',
        description: 'Add Currency enum with exchange rates. Wallet gets a currency field. Add convertCurrency(walletId, targetCurrency) method. Transactions store both original and converted amounts.',
        difficulty: 'Medium',
      },
      {
        area: 'Transaction Limits',
        description: 'Add daily/monthly transaction limits per wallet. sendMoney() checks limits before processing. Repository tracks daily totals. Exceeded limits return FAILED status.',
        difficulty: 'Easy',
      },
      {
        area: 'Scheduled Transfers',
        description: 'Add ScheduledPayment entity with recurrence (daily/weekly/monthly). A scheduled job processes due payments. Uses existing sendMoney() for execution.',
        difficulty: 'Medium',
      },
      {
        area: 'Fraud Detection',
        description: 'Add FraudDetectionService that analyzes transaction patterns: unusual amounts, rapid successive transfers, multiple failed attempts. Flags suspicious transactions as PENDING for review.',
        difficulty: 'Hard',
      },
      {
        area: 'QR Code Payments',
        description: 'Generate QR codes for wallet IDs. Frontend scans QR to auto-fill recipient. Backend adds generateQR(walletId) and processQRPayment(scannedId, amount) endpoints.',
        difficulty: 'Easy',
      },
      {
        area: 'Interest on Balance',
        description: 'Add daily interest calculation (e.g., 4% APR). A scheduled job credits interest to all wallets daily. Interest transactions have special type "INTEREST".',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaLudoRepository. Game state serialized as JSON or relational. Swap via Spring profile. Service layer unchanged due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  hotel: {
    title: 'Hotel Management — Design Details',
    requirements: [
      'Hotel management system with multiple hotels, rooms, and bookings',
      'Each hotel has a name, location, rating, and list of amenities',
      'Rooms are categorized as SINGLE, DOUBLE, SUITE, or DELUXE with different pricing',
      'Room states: AVAILABLE, BOOKED, OCCUPIED, MAINTENANCE — only AVAILABLE rooms can be booked',
      'Booking flow: book room (CONFIRMED) → check in (CHECKED_IN) → check out (CHECKED_OUT)',
      'Booking has associated guest name, check-in/out dates, and total amount (price × nights)',
      'Cancellation is allowed for CONFIRMED and CHECKED_IN bookings, restores room to AVAILABLE',
      'Thread-safe concurrent access via ReentrantLock — multiple guests can book simultaneously',
    ],
    entities: [
      {
        name: 'HotelService',
        description: 'Core business logic layer. Handles hotel search, room listing, booking, check-in, check-out, and cancellation. All booking state mutations are protected by ReentrantLock.',
        fields: [
          { name: 'repository', type: 'HotelRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic booking state transitions' },
        ],
        methods: [
          { name: 'getAllHotels()', returns: 'List<Hotel>', description: 'Returns all hotels in the system' },
          { name: 'getAvailableRooms(hotelId, dates)', returns: 'List<Room>', description: 'Returns available rooms for a hotel (simplified — all AVAILABLE status rooms)' },
          { name: 'bookRoom(roomId, userId, guestName, dates)', returns: 'Booking', description: 'Validates room availability → calculates total → marks room BOOKED → creates booking' },
          { name: 'checkIn(bookingId)', returns: 'Booking', description: 'Marks booking CHECKED_IN and room OCCUPIED' },
          { name: 'checkOut(bookingId)', returns: 'Booking', description: 'Marks booking CHECKED_OUT and room AVAILABLE' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking and restores room to AVAILABLE' },
        ],
      },
      {
        name: 'HotelRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'hotels', type: 'Map<String, Hotel>', description: 'All hotels indexed by ID (LinkedHashMap preserves order)' },
          { name: 'rooms', type: 'ConcurrentHashMap<String, Room>', description: 'All rooms indexed by ID' },
          { name: 'bookings', type: 'ConcurrentHashMap<String, Booking>', description: 'All bookings indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'getAvailableRooms(hotelId)', returns: 'List<Room>', description: 'Filters rooms by hotel and AVAILABLE status' },
          { name: 'generateBookingId()', returns: 'String', description: 'Atomic counter — produces "HBK-00001" format' },
          { name: 'saveBooking(booking)', returns: 'void', description: 'Thread-safe booking insert' },
          { name: 'getActiveBookings()', returns: 'List<Booking>', description: 'Returns CONFIRMED and CHECKED_IN bookings, sorted newest first' },
        ],
      },
      {
        name: 'Hotel',
        description: 'A hotel property with basic information and amenities.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (H1, H2)' },
          { name: 'name', type: 'String', description: 'Hotel display name, e.g. Grand Palace' },
          { name: 'location', type: 'String', description: 'City/location, e.g. Mumbai' },
          { name: 'rating', type: 'double', description: 'Star rating out of 5' },
          { name: 'amenities', type: 'List<String>', description: 'Facilities like Pool, Gym, Spa, WiFi' },
        ],
        methods: [],
      },
      {
        name: 'Room',
        description: 'A bookable room with type, pricing, and availability status.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (R1, R2)' },
          { name: 'roomNumber', type: 'String', description: 'Physical room number, e.g. 101' },
          { name: 'type', type: 'RoomType (enum)', description: 'SINGLE (₹3K), DOUBLE (₹5K), SUITE (₹12K), DELUXE (₹8K)' },
          { name: 'price', type: 'double', description: 'Per-night price in INR' },
          { name: 'status', type: 'RoomStatus (enum)', description: 'AVAILABLE, BOOKED, OCCUPIED, or MAINTENANCE' },
        ],
        methods: [
          { name: 'setStatus(status)', returns: 'void', description: 'Transitions room state, controlled by service' },
        ],
      },
      {
        name: 'Booking',
        description: 'A confirmed room reservation with guest info and payment details.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique booking identifier (HBK-00001)' },
          { name: 'roomId', type: 'String', description: 'Which room is booked' },
          { name: 'guestName', type: 'String', description: 'Name of the guest staying' },
          { name: 'checkIn', type: 'LocalDate', description: 'Check-in date' },
          { name: 'checkOut', type: 'LocalDate', description: 'Check-out date' },
          { name: 'status', type: 'BookingStatus (enum)', description: 'CONFIRMED → CHECKED_IN → CHECKED_OUT or CANCELLED' },
          { name: 'totalAmount', type: 'double', description: 'price × nights' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'HotelRepository abstracts all data access behind semantic methods. The service never touches maps directly — it calls getRoom(), generateBookingId(), and saveBooking(). This keeps business logic clean and enables testing with mock repositories.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring one consistent state across all requests. Critical since all data lives in memory and must be shared across concurrent users.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'HotelService receives HotelRepository via constructor injection. Spring auto-wires the dependency, making the service testable without Spring container and allowing repository swaps.',
      },
      {
        name: 'State Pattern',
        used: true,
        explanation: 'Room and Booking use enum-based state machines. Room: AVAILABLE → BOOKED → OCCUPIED → AVAILABLE. Booking: CONFIRMED → CHECKED_IN → CHECKED_OUT. Each service method checks the current state and transitions accordingly, preventing invalid transitions.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'bookRoom() wraps room status change + booking creation in a single ReentrantLock block. If any step fails, no partial state is committed. checkOut() similarly atomically updates both booking and room.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'HotelService handles booking business logic (validation, pricing, state transitions). HotelRepository manages data storage. HotelController handles HTTP concerns. Each has one clear responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new room type requires only adding an enum constant and pricing. New room statuses can be added without changing booking flow. The system is open for extension of room types and statuses.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'HotelService depends on HotelRepository abstraction. Spring injects the concrete implementation. Switching from in-memory to database requires only a new repository implementation.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Room status validation is centralized in bookRoom/checkIn/checkOut methods. Booking ID generation is in one place. Amount calculation uses a single formula (price × nights).',
      },
      {
        name: 'Fail-Fast Validation',
        description: 'Each operation validates state before making changes: bookRoom checks AVAILABLE, checkIn checks CONFIRMED, checkOut checks CHECKED_IN. Invalid transitions are rejected immediately.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — State Machine',
        description: 'Room and Booking statuses are only modified through controlled service methods. External code cannot directly change room status from AVAILABLE to OCCUPIED without going through checkIn().',
        alternative: 'Could expose public setters. Controlled mutation via service is chosen because it enforces business rules (only CHECKED_IN bookings can transition to CHECKED_OUT).',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Booking contains roomId (reference to Room) and hotelId. Room contains a hotelId reference. Entities are linked by ID rather than through inheritance hierarchies.',
        alternative: 'Could make Booking extend Room. Composition is chosen because a Booking is not a type of Room — it represents a temporary usage of a room.',
      },
      {
        name: 'Enum-based State Machine',
        description: 'RoomStatus and BookingStatus enums define valid states and transitions. Service methods check current state before transitioning, making the state machine explicit and type-safe.',
        alternative: 'Could use String status fields. Enums are chosen because they are type-safe, self-documenting, and prevent invalid status values at compile time.',
      },
    ],
    extensibility: [
      {
        area: 'Dynamic Pricing (Seasonal/Holiday)',
        description: 'Add a pricing strategy that adjusts room prices based on season, day of week, or occupancy. Can be implemented as a PricingStrategy interface without changing booking flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Room Service / Addons',
        description: 'Add ServiceRequest entity (room service, housekeeping, spa). Booking can have optional addons. Extends booking without changing core check-in/out flow.',
        difficulty: 'Medium',
      },
      {
        area: 'Multiple Locations / Search',
        description: 'Extend search to support city, date range, guests count, room type filter. Add caching for popular searches. No changes to booking flow.',
        difficulty: 'Medium',
      },
      {
        area: 'Online Payment Gateway',
        description: 'Add PaymentService interface. Call payment.process(amount) during booking creation. Refund on cancellation. Existing amount calculation unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'Loyalty Program',
        description: 'Add loyalty points per booking (₹1 = 1 point). Redeem points for discounts. Track member tiers (Silver/Gold/Platinum) with tier-based benefits.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaHotelRepository. Swap via Spring @Profile. No service layer changes needed due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  airline: {
    title: 'Airline Reservation — Design Details',
    requirements: [
      'Airline reservation system with multiple flights, seats, and bookings',
      'Flights have source, destination, departure/arrival times, airline, and flight number',
      'Seats are categorized as ECONOMY, BUSINESS, or FIRST with different pricing',
      'Each flight has 30 seats (5 rows × 6 cols), with rows A-B as BUSINESS and C-E as ECONOMY',
      'Seat states: AVAILABLE or BOOKED — only AVAILABLE seats can be booked',
      'Users can search flights by source and destination, view seat map with availability',
      'Booking flow: select seats → create booking (CONFIRMED) → check in (CHECKED_IN)',
      'Booking can be cancelled, which restores seats to AVAILABLE and updates flight available count',
      'Thread-safe concurrent access via ReentrantLock — multiple users can book simultaneously without double-booking',
    ],
    entities: [
      {
        name: 'AirlineService',
        description: 'Core business logic for flight search and seat booking. Handles seat selection, booking creation, check-in, and cancellation with thread-safe operations.',
        fields: [
          { name: 'repository', type: 'AirlineRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic booking and cancellation operations' },
        ],
        methods: [
          { name: 'searchFlights(src, dest, date)', returns: 'List<Flight>', description: 'Filters flights by source and destination' },
          { name: 'getSeats(flightId)', returns: 'List<Seat>', description: 'Returns all seats for a flight' },
          { name: 'bookFlight(flightId, seatIds, userId, passenger)', returns: 'Booking', description: 'Validates seats → marks BOOKED → creates booking → updates flight availability — thread safe' },
          { name: 'checkIn(bookingId)', returns: 'Booking', description: 'Marks booking as CHECKED_IN' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking, restores seats and flight available count' },
        ],
      },
      {
        name: 'AirlineRepository',
        description: 'In-memory data store with ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'flights', type: 'Map<String, Flight>', description: 'All flights indexed by ID' },
          { name: 'seats', type: 'ConcurrentHashMap<String, Seat>', description: 'All seats indexed by ID' },
          { name: 'bookings', type: 'ConcurrentHashMap<String, Booking>', description: 'All bookings indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'getAvailableSeatsByFlight(flightId)', returns: 'List<Seat>', description: 'Filters seats by flight and AVAILABLE status' },
          { name: 'generateBookingId()', returns: 'String', description: 'Atomic counter — produces "ABK-00001" format' },
          { name: 'saveBooking(booking)', returns: 'void', description: 'Thread-safe booking insert' },
          { name: 'getActiveBookings()', returns: 'List<Booking>', description: 'Returns CONFIRMED and CHECKED_IN bookings' },
        ],
      },
      {
        name: 'Flight',
        description: 'A scheduled flight with route, timing, and availability information.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (F1, F2)' },
          { name: 'flightNumber', type: 'String', description: 'Airline flight number, e.g. 6E-201' },
          { name: 'airline', type: 'String', description: 'Airline name, e.g. IndiGo' },
          { name: 'source', type: 'String', description: 'Departure city' },
          { name: 'destination', type: 'String', description: 'Arrival city' },
          { name: 'departureTime', type: 'LocalDateTime', description: 'Scheduled departure' },
          { name: 'arrivalTime', type: 'LocalDateTime', description: 'Scheduled arrival' },
          { name: 'totalSeats', type: 'int', description: 'Total seat count (30 per flight)' },
          { name: 'availableSeats', type: 'int', description: 'Currently available (decremented on booking)' },
          { name: 'fare', type: 'double', description: 'Base fare in INR' },
        ],
        methods: [],
      },
      {
        name: 'Seat',
        description: 'A specific seat on a flight with class, pricing, and availability.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (S1-S120 for 4 flights)' },
          { name: 'row', type: 'String', description: 'Row label (A-E)' },
          { name: 'col', type: 'String', description: 'Column number (1-6)' },
          { name: 'classType', type: 'SeatClass (enum)', description: 'ECONOMY, BUSINESS, or FIRST' },
          { name: 'price', type: 'double', description: 'Seat-specific price (Business = 2.5× base fare)' },
          { name: 'status', type: 'SeatStatus (enum)', description: 'AVAILABLE or BOOKED' },
        ],
        methods: [
          { name: 'setStatus(status)', returns: 'void', description: 'Transitions seat state, controlled by service' },
        ],
      },
      {
        name: 'Booking',
        description: 'A confirmed flight booking with passenger details and seat assignments.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique booking identifier (ABK-00001)' },
          { name: 'flightId', type: 'String', description: 'Which flight is booked' },
          { name: 'seatIds', type: 'List<String>', description: 'List of booked seat IDs' },
          { name: 'passengerName', type: 'String', description: 'Name of the passenger' },
          { name: 'status', type: 'BookingStatus (enum)', description: 'CONFIRMED → CHECKED_IN or CANCELLED' },
          { name: 'totalAmount', type: 'double', description: 'Sum of all booked seat prices' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'AirlineRepository encapsulates all data access behind semantic methods. The service calls getSeat(), updateSeat(), and saveBooking() rather than directly manipulating maps. This separates persistence concerns from business logic.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure consistent state across concurrent requests. Critical for preventing double-booking in an in-memory system.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'AirlineService receives AirlineRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories and allowing storage swaps.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'bookFlight() wraps all operations (validate seats → mark BOOKED → update flight → create booking) in a single ReentrantLock block. If any step fails, no partial state is committed. cancelBooking() similarly atomically restores seats and flight count.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'AirlineService handles booking business logic (seat validation, pricing, state transitions). AirlineRepository manages data storage. AirlineController handles HTTP concerns. Each has one clear responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new seat class (e.g., PREMIUM_ECONOMY) requires only adding an enum constant and price mapping. New booking statuses can be added without changing core book/cancel flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'AirlineService depends on AirlineRepository abstraction. Spring injects the concrete implementation. Switching storage (e.g., to Redis) requires only a new repository implementation.',
      },
      {
        name: 'Fail-Fast Validation',
        description: 'bookFlight() validates all seats before marking any as BOOKED. If any seat is already taken, the entire operation fails before any state change, preventing partial bookings.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Seat State Protection',
        description: 'Seat status is only modified through service.bookFlight() and cancelBooking(). External code cannot accidentally mark seats as available or booked.',
        alternative: 'Could expose public setters. Controlled mutation via service prevents double-booking bugs.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Booking contains a list of seat IDs and a flight ID (composition). Flight does not extend a base route class — it composes source/destination as fields.',
        alternative: 'Could extend a Route class. Composition is preferred because a Flight is not a specialized route — it has scheduling, pricing, and availability.',
      },
      {
        name: 'Enum-based Typing',
        description: 'SeatClass, SeatStatus, and BookingStatus enums provide type-safe categorization. Each drives switch/if-else logic for pricing (Business = 2.5× fare) and state transitions.',
        alternative: 'Could use String constants. Enums provide compile-time safety, IDE autocomplete, and prevent invalid values.',
      },
    ],
    extensibility: [
      {
        area: 'Dynamic Fare Pricing',
        description: 'Replace fixed 2.5× multiplier with a FareStrategy. Peak hours, advance booking discounts, and last-minute premiums can be implemented without changing booking flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Meal Preferences',
        description: 'Add MealPreference enum (VEG, NON_VEG, VEGAN) to Booking. Extend seat selection with meal option. No change to core booking flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Baggage Tracking',
        description: 'Add Baggage entity linked to Booking. Track check-in, loaded, unloaded, and claimed status. Extends check-in flow without modifying seat booking.',
        difficulty: 'Medium',
      },
      {
        area: 'Flight Status / Delays',
        description: 'Add status field to Flight (SCHEDULED, BOARDING, DEPARTED, LANDED, CANCELLED). Frontend shows real-time status. Service can notify affected bookings.',
        difficulty: 'Medium',
      },
      {
        area: 'Group Bookings',
        description: 'Allow booking multiple passengers in one transaction. Frontend shows group booking form. Backend creates multiple bookings atomically.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaAirlineRepository. Swap via Spring @Profile. No service layer changes needed due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  minesweeper: {
    title: 'Minesweeper — Design Details',
    requirements: [
      'Classic Minesweeper game on a grid with N rows × M columns',
      'M mines are randomly placed on the board (configurable difficulty)',
      'Left-click to reveal a cell; if it\'s a mine → game over (LOST)',
      'If revealed cell has 0 adjacent mines → flood-fill (BFS) reveals all neighboring cells recursively',
      'If revealed cell has N adjacent mines → shows number N (1-8)',
      'Right-click to toggle a flag on a cell; flag counter tracks flags used vs total mines',
      'Win condition: all non-mine cells are revealed (WON)',
      'Thread-safe concurrent access via ReentrantLock — multiple reveal/flag operations are atomic',
    ],
    entities: [
      {
        name: 'MinesweeperService',
        description: 'Core business logic for Minesweeper. Handles game creation (mine placement + adjacency calculation), cell reveal (with flood-fill BFS), flag toggle, and win/loss detection.',
        fields: [
          { name: 'repository', type: 'MinesweeperRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe game mutations' },
          { name: 'random', type: 'Random', description: 'Random number generator for mine placement' },
        ],
        methods: [
          { name: 'createGame(rows, cols, mines)', returns: 'Game', description: 'Creates board, randomly places mines, calculates adjacent counts for each cell' },
          { name: 'revealCell(gameId, row, col)', returns: 'Game', description: 'Reveals cell; if mine → LOST; if 0 adjacent → flood-fill; checks win condition' },
          { name: 'flagCell(gameId, row, col)', returns: 'Game', description: 'Toggles flag on cell (only on hidden cells), tracks flag count' },
          { name: 'getGame(id)', returns: 'Game', description: 'Returns current game state (hides mine positions while game is PLAYING)' },
        ],
      },
      {
        name: 'MinesweeperRepository',
        description: 'In-memory data store using ConcurrentHashMap for thread-safe game storage.',
        fields: [
          { name: 'games', type: 'ConcurrentHashMap<Long, Game>', description: 'All games indexed by ID' },
        ],
        methods: [
          { name: 'save(game)', returns: 'void', description: 'Stores/updates game in the map' },
          { name: 'get(id)', returns: 'Game', description: 'Retrieves game by ID' },
        ],
      },
      {
        name: 'Game',
        description: 'Central entity holding the Minesweeper board, game state, and statistics.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique game identifier' },
          { name: 'board', type: 'Cell[][]', description: '2D array of cells (rows × cols)' },
          { name: 'rows', type: 'int', description: 'Number of rows' },
          { name: 'cols', type: 'int', description: 'Number of columns' },
          { name: 'totalMines', type: 'int', description: 'Total number of mines on the board' },
          { name: 'status', type: 'GameStatus', description: 'PLAYING, WON, or LOST' },
          { name: 'flagsUsed', type: 'int', description: 'Number of flags currently placed' },
          { name: 'revealedCount', type: 'int', description: 'Number of successfully revealed cells' },
        ],
        methods: [],
      },
      {
        name: 'Cell',
        description: 'A single cell on the Minesweeper board with position and state.',
        fields: [
          { name: 'row', type: 'int', description: 'Row index (0-based)' },
          { name: 'col', type: 'int', description: 'Column index (0-based)' },
          { name: 'isMine', type: 'boolean', description: 'Whether this cell contains a mine' },
          { name: 'isRevealed', type: 'boolean', description: 'Whether the cell has been revealed' },
          { name: 'isFlagged', type: 'boolean', description: 'Whether the cell is flagged (cannot be revealed while flagged)' },
          { name: 'adjacentMines', type: 'int', description: 'Count of mines in adjacent cells (0-8). -1 if this cell itself is a mine' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'MinesweeperRepository abstracts all data access behind semantic methods like save() and get(). The service never touches maps directly, keeping business logic clean and the data layer swappable.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure one consistent game state across all requests. Critical since all game data lives in memory.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'MinesweeperService receives MinesweeperRepository via constructor injection. Spring auto-wires the dependency, enabling easy testing with mock repositories.',
      },
      {
        name: 'Observer Pattern',
        used: false,
        explanation: 'The frontend polls for game state updates. A WebSocket-based observer would push cell reveal events and game-over notifications in real-time without polling.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'MinesweeperService handles game logic (mine placement, reveal, flood-fill, win/loss). MinesweeperRepository handles data storage. GameController handles HTTP mapping. Each has one reason to change.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding new difficulty presets (rows/cols/mines combinations) requires no code changes to the core game logic. New cell states or game features can be added without modifying the existing reveal/flag flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on ConcurrentHashMap directly. Spring injects the concrete implementation, enabling storage strategy swaps.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Flood-fill logic is a single recursive function reused for all zero-count reveals. Adjacent mine counting uses one loop structure. Win check is a single formula (revealed + mines = total).',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Cell State Protection',
        description: 'Cell state (revealed, flagged, mine) is only modified through controlled service methods (revealCell, flagCell). External code cannot accidentally expose mines or modify the board.',
        alternative: 'Could expose cell fields as public. Controlled mutation via service ensures game rules are always enforced (can\'t flag a revealed cell, can\'t reveal a flagged cell).',
      },
      {
        name: 'Recursion — Flood-Fill Algorithm',
        description: 'When a cell with 0 adjacent mines is revealed, the service recursively reveals all 8 neighboring cells. If those also have 0 mines, the recursion continues (BFS-style). This mirrors the classic Minesweeper behavior.',
        alternative: 'Could use an iterative queue-based BFS. Recursion is chosen because it\'s simpler and the board size is small (max 256 cells), so stack overflow is not a concern.',
      },
      {
        name: '2D Array Composition',
        description: 'The board is a 2D array of Cell objects. The Game contains the board, not extends it. This composition approach allows the board to be easily accessed via grid coordinates.',
        alternative: 'Could use a flat array with index = row × cols + col. 2D array is chosen because it makes coordinate-based operations (neighbor lookup, flood-fill) more intuitive.',
      },
    ],
    extensibility: [
      {
        area: 'New Difficulty Levels',
        description: 'Add new preset to the frontend selector with custom rows/cols/mines. Backend already accepts these as parameters. No code changes needed.',
        difficulty: 'Easy',
      },
      {
        area: 'Timer / Leaderboard',
        description: 'Add timer field to Game. Track completion time. Frontend shows elapsed time. Leaderboard stores best times per difficulty. RevealCell stops timer on game over.',
        difficulty: 'Medium',
      },
      {
        area: 'First-Click Safety',
        description: 'Guarantee first reveal is never a mine. In createGame(), delay mine placement until first reveal. Place mines avoiding the first-click cell and its neighbors.',
        difficulty: 'Medium',
      },
      {
        area: 'Auto-Flag / Chord Reveal',
        description: 'Chord reveal: if a revealed number cell has N flagged neighbors and N = adjacentMines, auto-reveal remaining neighbors. Reduces repetitive clicking.',
        difficulty: 'Medium',
      },
      {
        area: 'Mine-Free Zones (Patterns)',
        description: 'Allow creating predefined patterns (e.g., guaranteed safe border). Useful for puzzles. Requires only changing mine placement logic in createGame().',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaMinesweeperRepository. Swap via Spring @Profile. Service layer unchanged.',
        difficulty: 'Medium',
      },
    ],
  },

  vendingmachine: {
    title: 'Vending Machine — Design Details',
    requirements: [
      'Vending machine with 10 products across 3 categories: Beverages (5), Snacks (3), Food (2)',
      'Products displayed in a 10-slot grid (2 rows × 5 cols) with name, price, and stock level',
      'Select a product → system reserves stock and creates a PENDING transaction with total amount',
      'Insert coins (₹5/10/20/50) incrementally until total amount is met or exceeded',
      'Once amount ≥ total, system transitions to PAID and allows dispensing',
      'Dispensing: stock is decremented, change is calculated (inserted - total), transaction is COMPLETED',
      'Cancel: pending transactions can be cancelled, releasing reserved stock',
      'State machine: IDLE → SELECTING → DISPENSING → COMPLETE → IDLE',
      'Thread-safe concurrent access via ReentrantLock — one transaction at a time',
    ],
    entities: [
      {
        name: 'VendingMachineService',
        description: 'Core business logic with a state machine pattern. Manages product selection, coin insertion, dispensing, and transaction lifecycle through IDLE → SELECTING → DISPENSING → COMPLETE states.',
        fields: [
          { name: 'repository', type: 'VendingRepository', description: 'Data access layer injected via constructor' },
          { name: 'state', type: 'VendingState', description: 'Current machine state (IDLE/SELECTING/DISPENSING/COMPLETE)' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic operations — one transaction at a time' },
        ],
        methods: [
          { name: 'getProducts()', returns: 'List<Map>', description: 'Returns all products with slots, prices, and stock levels' },
          { name: 'selectProduct(productId, quantity)', returns: 'Transaction', description: 'Checks stock → reserves product → creates PENDING transaction' },
          { name: 'insertCoin(transactionId, amount)', returns: 'Transaction', description: 'Adds to inserted amount; if >= total, marks PAID and transitions to DISPENSING' },
          { name: 'dispense(transactionId)', returns: 'Transaction', description: 'Decrements stock from products and slots → calculates change → marks COMPLETED' },
          { name: 'cancelTransaction(transactionId)', returns: 'Transaction', description: 'Cancels PENDING/PAID transaction, releases stock, returns to IDLE' },
        ],
      },
      {
        name: 'VendingRepository',
        description: 'In-memory data store with ConcurrentHashMap and seed data for 10 products with assigned slots.',
        fields: [
          { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'All products indexed by ID (10 products pre-seeded)' },
          { name: 'slots', type: 'ConcurrentHashMap<Long, Slot>', description: 'All slots indexed by ID (10 slots, one per product)' },
          { name: 'transactions', type: 'ConcurrentHashMap<Long, Transaction>', description: 'All transactions indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic product/stock operations' },
        ],
        methods: [
          { name: 'getAllProducts()', returns: 'List<Product>', description: 'Returns all products sorted by ID' },
          { name: 'findSlotByProductId(id)', returns: 'Slot', description: 'Finds the slot containing a specific product' },
          { name: 'saveTransaction(txn)', returns: 'void', description: 'Thread-safe transaction storage' },
        ],
      },
      {
        name: 'Product',
        description: 'A vendible item with pricing and inventory tracking.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique product identifier' },
          { name: 'name', type: 'String', description: 'Product name (Coke, Pepsi, Water, etc.)' },
          { name: 'price', type: 'double', description: 'Price in INR (₹10-₹50)' },
          { name: 'quantity', type: 'int', description: 'Total inventory count' },
          { name: 'category', type: 'String', description: 'Beverage, Snack, or Food' },
        ],
        methods: [],
      },
      {
        name: 'Slot',
        description: 'A physical slot in the vending machine containing a product with capacity tracking.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique slot identifier' },
          { name: 'productId', type: 'long', description: 'Which product is in this slot' },
          { name: 'row', type: 'int', description: 'Grid row position (0-1)' },
          { name: 'col', type: 'int', description: 'Grid column position (0-3)' },
          { name: 'capacity', type: 'int', description: 'Max capacity (5 per slot)' },
          { name: 'currentStock', type: 'int', description: 'How many units are currently in the slot' },
        ],
        methods: [],
      },
      {
        name: 'Transaction',
        description: 'A purchase transaction tracking the entire lifecycle from selection to completion.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique transaction identifier' },
          { name: 'selectedProductIds', type: 'List<Long>', description: 'IDs of selected products' },
          { name: 'totalAmount', type: 'double', description: 'Total cost of selected items' },
          { name: 'insertedAmount', type: 'double', description: 'Cumulative money inserted' },
          { name: 'change', type: 'double', description: 'Change returned (inserted - total, 0 if exact)' },
          { name: 'status', type: 'String', description: 'PENDING → PAID → COMPLETED or CANCELLED' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the transaction was created' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'VendingRepository abstracts all data access behind semantic methods. The service calls getProduct(), findSlotByProductId(), and saveTransaction() rather than manipulating maps directly.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure a single machine state shared across all requests. This is critical since a physical vending machine has exactly one state.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'VendingMachineService receives VendingRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories.',
      },
      {
        name: 'State Machine Pattern',
        used: true,
        explanation: 'VendingState enum drives the machine lifecycle: IDLE → SELECTING (product selected) → DISPENSING (payment complete) → COMPLETE (product dispensed). Service methods check and transition state, preventing invalid operations (cannot dispense without payment).',
      },
      {
        name: 'Template Method Pattern',
        used: false,
        explanation: 'The insert-pay-dispense flow is fixed, but payment methods could vary (coins, card, UPI). A PaymentProcessor interface with CoinPayment, CardPayment, UpiPayment implementations would make payment extensible.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'VendingMachineService handles business logic (selection, payment, dispensing). VendingRepository handles data storage. VendingController handles HTTP mapping. Each has one clear responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new product requires only adding an entry in the repository seed data. New payment methods can be added without modifying the core select → pay → dispense flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on ConcurrentHashMap directly. Spring injects the concrete implementation, enabling storage strategy swaps.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Stock validation is in selectProduct(). Change calculation is a single formula in dispense(). Status transitions are managed by the state machine in one place.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — State Machine',
        description: 'VendingState is only modified by the service through controlled methods. External code cannot directly set the machine state, ensuring the lifecycle (IDLE → SELECTING → DISPENSING → COMPLETE) is always respected.',
        alternative: 'Could expose state as a public field. Encapsulation prevents invalid transitions like going directly from IDLE to COMPLETE without payment.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Transaction contains a list of product IDs (composition). Slot does not extend Product — it references a productId. This models the real-world relationship: slots contain products, they don\'t become products.',
        alternative: 'Could make Slot extend Product. Composition is chosen because a Slot is not a type of Product — it\'s a physical location that holds inventory.',
      },
      {
        name: 'State Pattern — Lifecycle Management',
        description: 'VendingState enum drives what operations are allowed at each stage. SELECTING allows insertCoin but not dispense. DISPENSING allows dispense but not select. This prevents illegal operations at the state level.',
        alternative: 'Could use boolean flags (isPaid, isSelected). Enum is chosen because it naturally represents a finite state machine with clear transitions between states.',
      },
    ],
    extensibility: [
      {
        area: 'More Products / Slots',
        description: 'Add new products and slots in the repository constructor. Increase grid size on frontend. Backend handles it automatically.',
        difficulty: 'Easy',
      },
      {
        area: 'Card / UPI Payment',
        description: 'Add PaymentMethod enum (COIN, CARD, UPI). Extend insertCoin() to accept payment method type. Add virtual card reader simulation on frontend.',
        difficulty: 'Medium',
      },
      {
        area: 'Multi-Quantity Purchase',
        description: 'The backend already supports quantity in selectProduct(). Frontend needs a quantity selector per product. dispense() handles multiple items.',
        difficulty: 'Easy',
      },
      {
        area: 'Maintenance Mode',
        description: 'Add MAINTENANCE state. Refill stock via admin endpoint. Frontend shows maintenance overlay. Regular operations blocked in MAINTENANCE state.',
        difficulty: 'Medium',
      },
      {
        area: 'Discount / Promotions',
        description: 'Add DiscountService. Apply percentage or BOGO offers during selectProduct(). Frontend shows discounted price. Core payment/dispense flow unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'Nutritional Info Display',
        description: 'Add nutritional info fields to Product. Frontend shows calorie/sugar info on product click. No backend logic changes.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaVendingRepository. Swap via Spring @Profile. Service layer unchanged.',
        difficulty: 'Medium',
      },
    ],
  },

  inventory: {
    title: 'Inventory Management — Design Details',
    requirements: [
      'Product catalog with SKU, category, pricing, stock levels, and reorder thresholds',
      'Stock movements tracking: INBOUND (restock), OUTBOUND (sale), TRANSFER (warehouse to warehouse)',
      'Low stock alerts — products below reorder level are flagged for restocking',
      'Color-coded stock status: green (sufficient), yellow (low), red (critical)',
      'Warehouse transfer support — move stock between locations with full traceability',
      'Thread-safe concurrent stock updates with ReentrantLock to prevent race conditions',
      'Supplier management — each product linked to a supplier for procurement tracking',
    ],
    entities: [
      {
        name: 'InventoryService',
        description: 'Core business logic layer. Handles product CRUD, stock movements (INBOUND/OUTBOUND/TRANSFER), low-stock queries, and supplier management. All stock-modifying operations are thread-safe.',
        fields: [
          { name: 'repository', type: 'InventoryRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic stock update operations' },
        ],
        methods: [
          { name: 'addProduct(product)', returns: 'Product', description: 'Creates a new product with auto-generated ID' },
          { name: 'getProducts(category)', returns: 'List<Product>', description: 'Lists all products, optionally filtered by category' },
          { name: 'updateStock(productId, qty, type, reason)', returns: 'StockMovement', description: 'INBOUND adds stock, OUTBOUND reduces; creates movement record' },
          { name: 'getLowStockItems(threshold)', returns: 'List<Product>', description: 'Products with currentStock <= threshold' },
          { name: 'transferStock(productId, from, to, qty)', returns: 'StockMovement', description: 'Moves stock between warehouse locations' },
          { name: 'getStockMovements(productId)', returns: 'List<StockMovement>', description: 'Full movement history for a product' },
        ],
      },
      {
        name: 'InventoryRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock. Seeds 8 products across 4 categories with varying stock levels and 3 suppliers.',
        fields: [
          { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'Product catalog indexed by ID' },
          { name: 'suppliers', type: 'ConcurrentHashMap<Long, Supplier>', description: 'Supplier directory indexed by ID' },
          { name: 'movements', type: 'ConcurrentHashMap<Long, List<StockMovement>>', description: 'Stock movements indexed by productId' },
          { name: 'productIdGen', type: 'AtomicLong', description: 'Auto-incrementing product ID generator' },
        ],
      },
      {
        name: 'StockMovement',
        description: 'Records every stock change with type, quantity, timestamp, reason, and reference ID for full audit trail.',
        fields: [
          { name: 'type', type: 'StockMovementType', value: 'INBOUND | OUTBOUND | TRANSFER', description: 'Direction of stock movement' },
          { name: 'productId', type: 'long', description: 'Product whose stock changed' },
          { name: 'quantity', type: 'int', description: 'Number of units moved (always positive)' },
          { name: 'referenceId', type: 'String', description: 'Business reference e.g. PO-001 or TRF-123' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Repository Pattern', description: 'InventoryRepository abstracts data storage behind a clean interface. Service never touches ConcurrentHashMap directly.' },
      { name: 'Service Layer', description: 'InventoryService encapsulates all business logic with ReentrantLock for thread-safe stock operations.' },
      { name: 'Value Object', description: 'StockMovement is an immutable-like value object representing a domain event.' },
      { name: 'Strategy (implicit)', description: 'Stock update type (INBOUND vs OUTBOUND) acts as a strategy for how quantities affect currentStock.' },
    ],
    solid: [
      { principle: 'S — Single Responsibility', description: 'Product owns product data, StockMovement owns movement data, InventoryService owns business logic, InventoryRepository owns persistence.' },
      { principle: 'O — Open/Closed', description: 'New StockMovementType values can be added without changing existing code. New categories extend the enum safely.' },
      { principle: 'L — Liskov Substitution', description: 'All repository methods return interfaces (List). Any List implementation works without breaking callers.' },
      { principle: 'I — Interface Segregation', description: 'Service exposes fine-grained methods (addProduct, updateStock, transferStock) rather than one generic method.' },
      { principle: 'D — Dependency Inversion', description: 'Controller depends on InventoryService abstraction, not concrete implementation. Spring DI handles wiring.' },
    ],
    oop: [
      { name: 'Encapsulation', description: 'Product hides its stock mutation behind service methods. External code cannot modify stock directly.' },
      { name: 'Inheritance', description: 'All model classes extend Object. StockMovementType is an enum inheriting Enum behaviors.' },
      { name: 'Polymorphism', description: 'getProducts() works with or without category filter via overloaded repository methods.' },
      { name: 'Abstraction', description: 'StockMovement abstracts the concept of inventory change regardless of direction or reason.' },
    ],
    extensibility: [
      {
        area: 'New Movement Types',
        description: 'Add a new value to StockMovementType enum (e.g., DAMAGED, RETURN). Service logic for handling it goes in updateStock().',
        difficulty: 'Easy',
      },
      {
        area: 'Batch Operations',
        description: 'Add batchUpdateStock() that processes multiple products atomically using the existing ReentrantLock.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement InventoryJpaRepository. Swap via Spring @Profile. Service unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'Analytics Dashboard',
        description: 'Add InventoryAnalyticsService that computes turnover rates, stock aging, and movement patterns from existing StockMovement records.',
        difficulty: 'Medium',
      },
      {
        area: 'Multi-Warehouse',
        description: 'Add Warehouse entity with location field. StockMovement gets fromLocation/toLocation. Transfer becomes cross-warehouse.',
        difficulty: 'Hard',
      },
    ],
  },

  shoppingcart: {
    title: 'Shopping Cart — Design Details',
    requirements: [
      'Product catalog with name, description, price, image, category, and available quantity',
      'Cart management — add items, remove items, update quantities with real-time total calculation',
      'Checkout flow — converts cart to order, clears cart, tracks order status through lifecycle',
      'Order state machine: PENDING → CONFIRMED → SHIPPED → DELIVERED, or CANCELLED from any state',
      'Thread-safe concurrent cart operations — multiple items can be added/removed simultaneously',
      'Seed data with 8 diverse products across categories for out-of-the-box testing',
    ],
    entities: [
      {
        name: 'ShoppingCartService',
        description: 'Core business logic. Manages product catalog, cart operations, checkout flow, and order lifecycle. All cart-modifying operations are thread-safe with ReentrantLock.',
        fields: [
          { name: 'repository', type: 'ShoppingCartRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic cart and order operations' },
        ],
        methods: [
          { name: 'getProducts()', returns: 'List<Product>', description: 'Returns full product catalog' },
          { name: 'addToCart(cartId, userId, productId, qty)', returns: 'Cart', description: 'Adds item to cart; creates cart if cartId=0' },
          { name: 'removeFromCart(cartId, productId)', returns: 'Cart', description: 'Removes item from cart entirely' },
          { name: 'updateQuantity(cartId, productId, qty)', returns: 'Cart', description: 'Changes item quantity; removes if qty<=0' },
          { name: 'checkout(cartId, shippingAddress)', returns: 'Order', description: 'Creates order from cart items, clears cart' },
          { name: 'updateOrderStatus(orderId, status)', returns: 'Order', description: 'Advances order through state machine' },
        ],
      },
      {
        name: 'ShoppingCartRepository',
        description: 'In-memory data store using ConcurrentHashMap. Seeds 8 products across Electronics, Clothing, Footwear, Accessories, Kitchen, and Stationery categories.',
        fields: [
          { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'Product catalog indexed by ID' },
          { name: 'carts', type: 'ConcurrentHashMap<Long, Cart>', description: 'Active carts indexed by cart ID' },
          { name: 'orders', type: 'ConcurrentHashMap<Long, Order>', description: 'Completed orders indexed by order ID' },
        ],
      },
      {
        name: 'Cart',
        description: 'Value object representing a user shopping cart. Contains a Map<productId, CartItem> for O(1) item lookup and automatic total recalculation.',
        fields: [
          { name: 'items', type: 'Map<Long, CartItem>', description: 'Cart items indexed by productId for fast lookup' },
          { name: 'totalAmount', type: 'double', description: 'Auto-computed sum of all item totalPrices' },
          { name: 'createdAt', type: 'LocalDateTime', description: 'Timestamp when cart was first created' },
        ],
      },
      {
        name: 'Order',
        description: 'Value object capturing a completed purchase. Follows status state machine. Delivery time is set when status becomes DELIVERED.',
        fields: [
          { name: 'status', type: 'OrderStatus', value: 'PENDING→CONFIRMED→SHIPPED→DELIVERED', description: 'Order lifecycle state' },
          { name: 'items', type: 'List<CartItem>', description: 'Snapshot of cart items at checkout time' },
          { name: 'shippingAddress', type: 'String', description: 'Delivery destination' },
          { name: 'deliveryTime', type: 'LocalDateTime', description: 'Set when status becomes DELIVERED' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Repository Pattern', description: 'ShoppingCartRepository abstracts storage behind clean interface. Service never touches ConcurrentHashMap directly.' },
      { name: 'Service Layer', description: 'ShoppingCartService encapsulates all business logic with ReentrantLock for thread safety.' },
      { name: 'State Machine', description: 'OrderStatus enum defines the order lifecycle. Service validates transitions by checking current state.' },
      { name: 'Value Object', description: 'CartItem is an immutable-like value object with auto-computed totalPrice on quantity/price change.' },
    ],
    solid: [
      { principle: 'S — Single Responsibility', description: 'Product owns product data, CartItem owns line-item data, Cart owns cart state, Order owns order state, Service owns business rules.' },
      { principle: 'O — Open/Closed', description: 'New OrderStatus values (e.g., RETURNED) can be added without changing existing transitions. New product categories are trivially added.' },
      { principle: 'L — Liskov Substitution', description: 'Repository returns standard List/Map interfaces. Any implementation (in-memory, JPA) works interchangeably.' },
      { principle: 'I — Interface Segregation', description: 'Service exposes focused methods (addToCart, removeFromCart, updateQuantity, checkout) rather than a generic execute() method.' },
      { principle: 'D — Dependency Inversion', description: 'Controller depends on ShoppingCartService interface. Spring DI handles implementation injection.' },
    ],
    oop: [
      { name: 'Encapsulation', description: 'Cart hides its items map behind getItems(). Items cannot be modified without going through service methods that enforce business rules.' },
      { name: 'Inheritance', description: 'All model classes extend Object. OrderStatus is an enum inheriting Enum behaviors.' },
      { name: 'Polymorphism', description: 'Cart.recalculateTotal() works regardless of how many items or what types of products are in the cart.' },
      { name: 'Abstraction', description: 'CartItem abstracts the concept of a product+quantity+price combo regardless of which product it represents.' },
    ],
    extensibility: [
      {
        area: 'Discounts & Coupons',
        description: 'Add DiscountStrategy interface (PercentageDiscount, FlatDiscount, BuyOneGetOne). Apply during checkout before order creation.',
        difficulty: 'Medium',
      },
      {
        area: 'Payment Integration',
        description: 'Add PaymentService interface. Call processPayment() during checkout. Order status transitions to CONFIRMED only on payment success.',
        difficulty: 'Medium',
      },
      {
        area: 'Multiple Cart Support',
        description: 'Allow multiple carts per user (wishlist, saved-for-later). Cart already supports userId field — extend with cart name and saved status.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement ShoppingCartJpaRepository. Swap via Spring @Profile. Service layer unchanged thanks to Dependency Injection.',
        difficulty: 'Medium',
      },
      {
        area: 'Inventory Integration',
        description: 'On checkout, call InventoryService.updateStock() for each product to reduce available quantity. Prevents overselling.',
        difficulty: 'Medium',
      },
    ],
  },
};

export default designDetails;

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
};

export default designDetails;

// designDetails — parking
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Parking Lot — Design Details',
  tldr: [
    'Multi-floor parking lot supporting CAR, BIKE, TRUCK with entry/exit gate separation',
    'Strategy + EnumMap-resolved Factory for spot assignment (Nearest vs Farthest) and pricing (Hourly, Flat, Dynamic surge)',
    'Typed exception hierarchy (ParkingLotException) mapped to the right HTTP status by GlobalExceptionHandler — no bare IllegalArgumentException/IllegalStateException left in the service',
    'Thread safety via a single ReentrantLock around the whole search-then-claim spot allocation, and an atomic check-then-mutate exit path that closes the double-payment race',
    'Two-step exit flow: Scan (Preview Price) -> Pay & Exit (Release Spot & Issue Receipt)',
    'Isolated /sim/* sandbox — its own 2-floor, 10-spot lot and event log — backs the interactive simulation tab so a demo run can never touch the live lot'
  ],
  requirements: [
    'Multi-floor parking lot with 3 types of spots: CAR (12), BIKE (12), TRUCK (6) — 30 spots total across 3 floors',
    'Multiple gates: G1/G2 (Entry), G3/G4 (Exit) — vehicles can only enter through entry gates and exit through exit gates',
    'Vehicle entry: driver enters through an entry gate → selects spot strategy (Nearest / Farthest) → system assigns spot and issues ticket',
    'Multi-step vehicle exit: Step 1 scans the ticket and shows a price preview (spot retained, UNPAID) → Step 2 picks a payment method and pays, which atomically marks the ticket PAID and releases the spot',
    'Extensible pricing strategies: HourlyPricingStrategy (CAR ₹20/hr, BIKE ₹10/hr, TRUCK ₹40/hr, 1-hour minimum), FlatRatePricingStrategy (flat per-type rate), DynamicPricingStrategy (1.5x surge over the hourly base)',
    'Extensible spot assignment strategies: NearestSpotStrategy (lowest floor, then lowest spot number) vs FarthestSpotStrategy (highest floor, then highest spot number)',
    'Every failure mode (unknown gate, wrong gate type, unsupported vehicle type, no spot available, unknown ticket, already-exited ticket) is a typed exception with the correct HTTP status, not a generic 400',
    'Two vehicles racing for the same last spot, or two concurrent exit requests for the same ticket, must resolve to exactly one winner — never a double-booking or a double payment'
  ],
  entities: [
    {
      name: 'ParkingLotService',
      description: 'Core business logic layer. Handles entry (assign spot + create ticket) and multi-step exit (scan preview + process payment & release spot). Delegates every branch on policy to the two strategy factories, and every failure to a typed exception.',
      fields: [
        { name: 'repository', type: 'ParkingLotRepository', description: 'Data access + locking layer injected via Spring constructor injection' },
        { name: 'spotStrategyFactory', type: 'SpotAssignmentStrategyFactory', description: 'EnumMap-resolved factory for NEAREST / FARTHEST spot selection' },
        { name: 'pricingStrategyFactory', type: 'PricingStrategyFactory', description: 'EnumMap-resolved factory for HOURLY / FLAT / DYNAMIC pricing' }
      ],
      methods: [
        { name: 'entry(dto)', returns: 'Ticket', description: 'Validates the gate is ENTRY, parses the vehicle type, finds a spot via the selected strategy, generates a ticket number, saves — throws GateNotFoundException / InvalidGateTypeException / VehicleTypeNotSupportedException / SpotNotAvailableException' },
        { name: 'scanTicket(gateId, ticketNumber, pricingStrategyName)', returns: 'Ticket', description: 'Validates the exit gate & ticket, computes a preview charge on a throwaway copy — spot and live ticket are untouched' },
        { name: 'payAndExit(gateId, ticketNumber, pricingStrategyName, paymentMethod)', returns: 'Ticket', description: 'Validates the exit gate, then delegates the not-found / already-exited check and the PAID mutation to repository.completeExit() as one atomic operation, then releases the spot' },
        { name: 'getGates()', returns: 'List<Gate>', description: 'Returns all configured gates' },
        { name: 'getFloors()', returns: 'List<Floor>', description: 'Returns all floors with their spots' },
        { name: 'getActiveTickets()', returns: 'List<Ticket>', description: 'Returns all tickets with no exit time, newest first' }
      ]
    },
    {
      name: 'ParkingLotSimService',
      description: 'Isolated /sim/* sandbox: its own 2-floor, 10-spot lot, its own gates and tickets, and an in-memory event log — entirely separate state from the live repository, so a demo run driven from the simulation tab can never occupy a real spot or issue a real ticket. Reuses the same strategy factory beans as the live service.',
      fields: [
        { name: 'simSpots / simTickets', type: 'ConcurrentHashMap', description: 'Sandbox-only spot and ticket state' },
        { name: 'simEventLog', type: 'CopyOnWriteArrayList<SimEvent>', description: 'Telemetry log rendered by the simulation tab\'s event panel' },
        { name: 'simSpotLock / simTicketLock', type: 'ReentrantLock', description: 'Same locking discipline as the live repository, scoped to the sandbox' }
      ],
      methods: [
        { name: 'reset()', returns: 'Map<String,Object>', description: 'Reseeds the sandbox lot and clears the event log' },
        { name: 'entry(vehicleNumber, vehicleType, strategy)', returns: 'Map<String,Object>', description: 'Sandbox equivalent of ParkingLotService.entry()' },
        { name: 'scan(ticketNumber, pricingStrategy)', returns: 'Map<String,Object>', description: 'Sandbox price preview' },
        { name: 'pay(ticketNumber, pricingStrategy, paymentMethod)', returns: 'Map<String,Object>', description: 'Sandbox pay & release, logged as a VEHICLE_EXITED event' }
      ]
    },
    {
      name: 'SpotAssignmentStrategyFactory',
      description: 'EnumMap<SpotAssignmentStrategyType, SpotAssignmentStrategy> built once in the constructor — the same shape as inventory.strategy.ReorderStrategyFactory. The service never branches on the policy itself.',
      fields: [
        { name: 'strategies', type: 'EnumMap<SpotAssignmentStrategyType, SpotAssignmentStrategy>', description: 'One entry per policy, wired at construction' }
      ],
      methods: [
        { name: 'getStrategy(strategyName)', returns: 'SpotAssignmentStrategy', description: 'Parses the string to SpotAssignmentStrategyType, defaults to NEAREST when blank, throws InvalidParkingRequestException for an unknown name' }
      ]
    },
    {
      name: 'PricingStrategyFactory',
      description: 'EnumMap<PricingStrategyType, PricingStrategy> built once in the constructor.',
      fields: [
        { name: 'strategies', type: 'EnumMap<PricingStrategyType, PricingStrategy>', description: 'One entry per policy, wired at construction' }
      ],
      methods: [
        { name: 'getStrategy(strategyName)', returns: 'PricingStrategy', description: 'Parses the string to PricingStrategyType, defaults to HOURLY when blank, throws InvalidParkingRequestException for an unknown name' }
      ]
    },
    {
      name: 'ParkingLotRepository',
      description: 'In-memory data store. Owns the two locks that make spot allocation and ticket exit correct under concurrency, and is the only place either critical section is allowed to live.',
      fields: [
        { name: 'floors', type: 'Map<String, Floor>', description: 'LinkedHashMap — preserves insertion order of floors' },
        { name: 'spots', type: 'ConcurrentHashMap<String, ParkingSpot>', description: 'All spots indexed by ID for O(1) lookup' },
        { name: 'tickets', type: 'ConcurrentHashMap<String, Ticket>', description: 'All tickets indexed by ticket number' },
        { name: 'gates', type: 'Map<String, Gate>', description: 'All gates indexed by gate ID' },
        { name: 'spotLock', type: 'ReentrantLock', description: 'Guards the whole search-then-claim in occupySpot() — a per-spot lock cannot provide this, since the strategy must scan every spot to pick one' },
        { name: 'ticketLock', type: 'ReentrantLock', description: 'Guards ticket-number generation and the exit check-then-act in completeExit()' }
      ],
      methods: [
        { name: 'occupySpot(vehicleType, strategy)', returns: 'ParkingSpot', description: 'Atomically searches and claims a spot under spotLock; returns null when none is free' },
        { name: 'releaseSpot(spotId)', returns: 'void', description: 'Marks a spot free under spotLock; throws SpotNotFoundException for an unknown id' },
        { name: 'completeExit(ticketNumber, exitTime, pricingStrategy, paymentMethod)', returns: 'Ticket', description: 'Validates not-found / already-exited and mutates to PAID in one ticketLock acquisition — the fix for the double-exit race' },
        { name: 'generateTicketNumber()', returns: 'String', description: 'Atomic counter under ticketLock — produces "TKT-00001" format' },
        { name: 'getActiveTickets()', returns: 'List<Ticket>', description: 'Filters tickets where exitTime == null, sorted newest first' }
      ]
    },
    {
      name: 'Ticket',
      description: 'Lombok @Data @Builder value object representing a parking session. Created on entry, previewed on scan, finalized on payment & exit.',
      fields: [
        { name: 'ticketNumber', type: 'String', description: 'Unique identifier (auto-generated), e.g. TKT-00001' },
        { name: 'vehicleNumber', type: 'String', description: 'License plate of the vehicle, e.g. KA-01-AB-1234' },
        { name: 'vehicleType', type: 'VehicleType', description: 'CAR, BIKE, or TRUCK — determines spot & base rate' },
        { name: 'spotId', type: 'String', description: 'Assigned parking spot ID, e.g. F1-C2' },
        { name: 'entryTime', type: 'LocalDateTime', description: 'Timestamp when vehicle entered' },
        { name: 'exitTime', type: 'LocalDateTime', description: 'Timestamp when vehicle exited (null while active)' },
        { name: 'amount', type: 'double', description: 'Calculated charge (0.0 while active, set by PricingStrategy on exit)' },
        { name: 'paymentStatus', type: 'PaymentStatus', description: 'UNPAID on scan preview, PAID once completeExit() succeeds' },
        { name: 'paymentMethod', type: 'String', description: 'UPI, CARD, or CASH — recorded on payment' }
      ],
      methods: []
    },
    {
      name: 'ParkingSpot',
      description: 'Lombok @Data @Builder value object for a single parking spot.',
      fields: [
        { name: 'id', type: 'String', description: 'Format: F{floor}-{type}{number}, e.g. F1-C2' },
        { name: 'floorNumber', type: 'int', description: 'Floor level (1-3)' },
        { name: 'spotNumber', type: 'int', description: 'Sequential number within vehicle type on that floor' },
        { name: 'vehicleType', type: 'VehicleType', description: 'Supported vehicle category (CAR/BIKE/TRUCK)' },
        { name: 'occupied', type: 'boolean', description: 'Occupancy status' }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Spot assignment (NearestSpotStrategy, FarthestSpotStrategy) and ticket pricing (HourlyPricingStrategy, FlatRatePricingStrategy, DynamicPricingStrategy) are both interchangeable strategies selected at runtime — the service never has an if/switch over the policy name.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'SpotAssignmentStrategyFactory and PricingStrategyFactory each hold an EnumMap built once at construction and resolve a strategy in one lookup — the same shape as inventory.strategy.ReorderStrategyFactory.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'ParkingLotRepository abstracts data access and concurrency locking away from the service layer. The two critical sections that need atomicity (spot search-then-claim, ticket check-then-pay) live entirely inside the repository, not split across service and repository.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring @Service, @Repository, and both strategy factories are singletons, giving one consistent view of lot state across all requests.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'The service receives the repository and both strategy factories via constructor injection; ParkingLotSimService receives the same factory beans, so strategy math is never duplicated between the live service and the sandbox.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'ParkingLotService orchestrates the entry/exit workflow. ParkingLotRepository owns storage and locking. Pricing strategies compute fares. Spot strategies pick spots. ParkingLotSimService owns only the sandbox\'s isolated state. Each has exactly one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new pricing model or spot-selection policy is a new enum constant, a new PricingStrategy/SpotAssignmentStrategy implementation, and one line in the factory constructor — the service and repository are never touched.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'ParkingLotService depends on the PricingStrategy/SpotAssignmentStrategy interfaces and the repository, not on concrete implementations — Spring injects the concrete beans at runtime.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any PricingStrategy can replace any other behind the PricingStrategyFactory without the caller knowing which one it got — same for SpotAssignmentStrategy.'
    },
    {
      name: 'Encapsulation',
      description: 'All fields are private with Lombok-generated accessors. The repository\'s internal maps are never exposed directly — only queried through controlled, lock-guarded methods. A ticket\'s amount and PAID status can only change inside completeExit().'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Strategy dispatch',
      description: 'PricingStrategy and SpotAssignmentStrategy implementations are polymorphically selected by their factories based on an enum parsed from the request string, then invoked through the interface — the service code is identical regardless of which concrete strategy runs.',
      alternative: 'Could inline a switch on vehicle type or strategy name at each call site (the pre-upgrade state of the DynamicPricingStrategy in an earlier revision). Strategy + Factory is chosen so the switch exists exactly once, in the factory.'
    },
    {
      name: 'Polymorphism — Enum-based vehicle dispatch',
      description: 'VehicleType (CAR/BIKE/TRUCK) drives both spot filtering and the rate table inside each pricing strategy via a switch expression, without if-else chains scattered across the codebase.',
      alternative: 'A class hierarchy (Car extends Vehicle) was considered, but vehicle types here are fixed, finite, and have no behavioral differences beyond rate/spot mapping — an enum is simpler and switch-friendly.'
    },
    {
      name: 'Encapsulation & Data Hiding',
      description: 'ParkingLotRepository wraps its ConcurrentHashMaps behind semantic, lock-guarded methods (occupySpot, releaseSpot, completeExit). No caller can mutate spot occupancy or ticket payment status by reaching around the repository.',
      alternative: 'Public fields would be simpler but would make the double-booking and double-exit races effectively unfixable — any caller could flip occupied without going through the lock.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Floor composes a List<ParkingSpot>; ParkingLotRepository composes maps rather than extending a generic store; ParkingLotSimService composes its own state rather than subclassing ParkingLotService.',
      alternative: 'Sharing state via inheritance (a SimParkingLotService extends ParkingLotService) was rejected — it would either corrupt the live repository or require overriding every method, which composition avoids entirely.'
    }
  ],
  extensibility: [
    { area: 'New vehicle types', description: 'Add a constant to VehicleType, a spot count in ParkingLotInitializer, a rate branch in each PricingStrategy\'s switch expression, and a frontend selector option.', difficulty: 'Easy' },
    { area: 'New pricing strategy', description: 'Implement PricingStrategy, add one constant to PricingStrategyType, register it in PricingStrategyFactory\'s constructor. The service and controller need no changes.', difficulty: 'Easy' },
    { area: 'New spot assignment strategy', description: 'Implement SpotAssignmentStrategy (e.g. a "closest to elevator" policy), add a SpotAssignmentStrategyType constant, register it in the factory.', difficulty: 'Easy' },
    { area: 'Database persistence', description: 'Implement a JPA-backed ParkingLotRepository with the same method signatures (including completeExit\'s atomicity contract, likely via a DB row lock or optimistic version check) and swap via Spring @Profile.', difficulty: 'Medium' },
    { area: 'Reservation system', description: 'Add a Reservation entity with a time slot; on entry, check for a matching reservation before falling back to the assignment strategy.', difficulty: 'Medium' },
    { area: 'Payment gateway integration', description: 'Add a PaymentGateway interface (Razorpay, Stripe, …), call it inside completeExit\'s critical section before marking PAID, and roll back the ticket mutation on a gateway failure.', difficulty: 'Medium' },
    { area: 'Multiple parking lots', description: 'Add a ParkingLot aggregate owning its own floors/spots/gates; every repository/service method takes a parkingLotId; the sim sandbox already demonstrates that per-lot isolation works.', difficulty: 'Hard' }
  ],
  tradeoffs: [
    'A single spotLock guards the whole search-then-claim in occupySpot() rather than a per-spot lock — the assignment strategy has to scan every spot to pick one, so the thing needing mutual exclusion is the search itself, not any one spot\'s flag.',
    'completeExit() folds the not-found/already-exited check and the PAID mutation into one repository method under one lock acquisition, rather than the service checking then writing — the latter is exactly the check-then-act race that let two concurrent payAndExit calls both succeed.',
    'The isolated /sim/* sandbox duplicates a small amount of entry/scan/pay orchestration rather than parameterizing the live service with "which repository" — the sandbox reuses the strategy beans (so pricing/assignment math is never duplicated) but keeps its own state, matching elevator/trafficsignal\'s sim-engine shape.',
    'In-memory ConcurrentHashMap storage eliminates DB overhead for lightning-fast sub-millisecond spot allocation, at the cost of losing all state on restart — acceptable for a design-demonstration repo with no persistence layer.'
  ]
};

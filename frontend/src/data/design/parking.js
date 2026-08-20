// designDetails — parking
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Parking Lot — Design Details',
  tldr: [
    'Multi-floor parking lot supporting CAR, BIKE, TRUCK with entry/exit gate separation',
    'Strategy Pattern for spot assignment (Nearest vs Farthest) & pricing calculation (Hourly, Flat, Dynamic Surge)',
    'Thread safety via fine-grained ReentrantLocks (spotLock, ticketLock) in ConcurrentHashMap storage',
    'Two-step exit flow: Scan (Preview Price) -> Pay & Exit (Release Spot & Issue Receipt)'
  ],
  requirements: [
    'Multi-floor parking lot with 3 types of spots: CAR (12), BIKE (12), TRUCK (6) — 30 spots total across 3 floors',
    'Multiple gates: G1/G2 (Entry), G3/G4 (Exit) — vehicles can only enter through entry gates and exit through exit gates',
    'Vehicle entry: driver enters through an entry gate → selects spot strategy (Nearest / Farthest) → system assigns spot and issues ticket',
    'Multi-step Vehicle exit: Step 1: Scan ticket & calculate price preview (UNPAID, spot retained) → Step 2: Select payment method (UPI, CARD, CASH) & pay → ticket marked PAID & spot released',
    'Extensible Pricing Strategies: HourlyPricingStrategy (CAR ₹20/hr, BIKE ₹10/hr, TRUCK ₹40/hr), FlatRatePricingStrategy (Flat rates), DynamicPricingStrategy (1.5x surge rate)',
    'Extensible Spot Assignment Strategies: NearestSpotStrategy (lowest floor & spot ID) vs FarthestSpotStrategy (highest floor & spot ID)',
    'Real-time spot availability tracking via concurrent-safe data structures',
    'Thread-safe concurrent access — fine-grained ReentrantLock (spotLock and ticketLock) ensures zero race conditions or double bookings'
  ],
  entities: [
    {
      name: 'ParkingLotService',
      description: 'Core business logic layer. Handles entry (assign spot + create ticket) and multi-step exit (scan preview + process payment & release spot). Uses Strategy Factories for spot allocation & pricing.',
      fields: [
        {
          name: 'repository',
          type: 'ParkingLotRepository',
          description: 'Data access layer injected via Spring @Autowired'
        },
        {
          name: 'spotStrategyFactory',
          type: 'SpotAssignmentStrategyFactory',
          description: 'Factory resolving spot assignment strategy ("NEAREST", "FARTHEST")'
        },
        {
          name: 'pricingStrategyFactory',
          type: 'PricingStrategyFactory',
          description: 'Factory resolving pricing strategy ("HOURLY", "FLAT", "DYNAMIC")'
        }
      ],
      methods: [
        {
          name: 'entry(dto)',
          returns: 'Ticket',
          description: 'Validates gate → finds spot via selected SpotAssignmentStrategy → generates ticket → saves'
        },
        {
          name: 'scanTicket(gateId, ticketNumber, pricingStrategyName)',
          returns: 'Ticket',
          description: 'Validates exit gate & ticket → computes preview charge (UNPAID) without releasing spot'
        },
        {
          name: 'payAndExit(gateId, ticketNumber, pricingStrategyName, paymentMethod)',
          returns: 'Ticket',
          description: 'Validates exit gate & ticket → calculates final charge → sets PAID & paymentMethod → releases spot'
        },
        {
          name: 'getGates()',
          returns: 'List<Gate>',
          description: 'Returns all configured gates'
        },
        {
          name: 'getFloors()',
          returns: 'List<Floor>',
          description: 'Returns all floors with their spots'
        },
        {
          name: 'getActiveTickets()',
          returns: 'List<Ticket>',
          description: 'Returns all tickets with no exit time'
        }
      ]
    },
    {
      name: 'SpotAssignmentStrategyFactory',
      description: 'Factory registry for spot assignment strategies. Resolves strategy instances dynamically based on strategy name ("NEAREST" vs "FARTHEST").',
      fields: [
        {
          name: 'strategies',
          type: 'Map<String, SpotAssignmentStrategy>',
          description: 'Map of strategy implementations keyed by uppercase name'
        }
      ],
      methods: [
        {
          name: 'getStrategy(strategyName)',
          returns: 'SpotAssignmentStrategy',
          description: 'Returns requested strategy implementation, defaulting to NEAREST if omitted'
        }
      ]
    },
    {
      name: 'PricingStrategyFactory',
      description: 'Factory registry for ticket pricing strategies. Resolves pricing strategy instances dynamically based on strategy name ("HOURLY", "FLAT", "DYNAMIC").',
      fields: [
        {
          name: 'strategies',
          type: 'Map<String, PricingStrategy>',
          description: 'Map of pricing strategy implementations keyed by uppercase name'
        }
      ],
      methods: [
        {
          name: 'getStrategy(strategyName)',
          returns: 'PricingStrategy',
          description: 'Returns requested pricing strategy implementation, defaulting to HOURLY if omitted'
        }
      ]
    },
    {
      name: 'ParkingLotRepository',
      description: 'In-memory data store using ConcurrentHashMap and fine-grained ReentrantLocks for thread safety. Single source of truth for all parking lot state.',
      fields: [
        {
          name: 'floors',
          type: 'Map<String, Floor>',
          description: 'LinkedHashMap — preserves insertion order of floors'
        },
        {
          name: 'spots',
          type: 'ConcurrentHashMap<String, ParkingSpot>',
          description: 'All spots indexed by ID for O(1) lookup'
        },
        {
          name: 'tickets',
          type: 'ConcurrentHashMap<String, Ticket>',
          description: 'All tickets indexed by ticket number'
        },
        {
          name: 'gates',
          type: 'Map<String, Gate>',
          description: 'All gates indexed by gate ID'
        },
        {
          name: 'spotLock',
          type: 'ReentrantLock',
          description: 'Ensures atomic spot occupy/release operations without contention'
        },
        {
          name: 'ticketLock',
          type: 'ReentrantLock',
          description: 'Ensures unique atomic ticket number generation'
        }
      ],
      methods: [
        {
          name: 'occupySpot(vehicleType, strategy)',
          returns: 'ParkingSpot',
          description: 'Finds & marks available spot of given type using strategy — thread safe via spotLock'
        },
        {
          name: 'releaseSpot(spotId)',
          returns: 'void',
          description: 'Marks spot as available — thread safe via spotLock'
        },
        {
          name: 'generateTicketNumber()',
          returns: 'String',
          description: 'Atomic counter — produces "TKT-00001" format via ticketLock'
        },
        {
          name: 'getActiveTickets()',
          returns: 'List<Ticket>',
          description: 'Filters tickets where exitTime == null, sorted newest first'
        }
      ]
    },
    {
      name: 'Ticket',
      description: 'Value object representing a parking session. Created on entry, previewed on scan, finalized on payment & exit.',
      fields: [
        {
          name: 'ticketNumber',
          type: 'String',
          description: 'Unique identifier (auto-generated), e.g. TKT-00001'
        },
        {
          name: 'vehicleNumber',
          type: 'String',
          description: 'License plate of the vehicle, e.g. KA-01-AB-1234'
        },
        {
          name: 'vehicleType',
          type: 'VehicleType',
          description: 'CAR, BIKE, or TRUCK — determines spot & base rate'
        },
        {
          name: 'spotId',
          type: 'String',
          description: 'Assigned parking spot ID, e.g. F1-C2'
        },
        {
          name: 'entryTime',
          type: 'LocalDateTime',
          description: 'Timestamp when vehicle entered'
        },
        {
          name: 'exitTime',
          type: 'LocalDateTime',
          description: 'Timestamp when vehicle exited (null while active)'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Calculated charge (0.0 while active, calculated via PricingStrategy)'
        },
        {
          name: 'paymentStatus',
          type: 'PaymentStatus',
          description: 'UNPAID on scan preview, PAID on exit payment'
        },
        {
          name: 'paymentMethod',
          type: 'String',
          description: 'UPI, CARD, or CASH — recorded on payment'
        }
      ],
      methods: []
    },
    {
      name: 'ParkingSpot',
      description: 'Represents a single parking spot with Lombok annotations (@Getter, @Setter).',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Format: F{floor}-{type}{number}, e.g. F1-C2'
        },
        {
          name: 'floorNumber',
          type: 'int',
          description: 'Floor level (1-3)'
        },
        {
          name: 'spotNumber',
          type: 'int',
          description: 'Sequential number within vehicle type on that floor'
        },
        {
          name: 'vehicleType',
          type: 'VehicleType',
          description: 'Supported vehicle category (CAR/BIKE/TRUCK)'
        },
        {
          name: 'occupied',
          type: 'boolean',
          description: 'Occupancy status'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Fully implemented Strategy pattern for both Parking Spot Assignment (NearestSpotStrategy, FarthestSpotStrategy) and Ticket Pricing (HourlyPricingStrategy, FlatRatePricingStrategy, DynamicPricingStrategy). Strategies are selected dynamically at runtime without modifying service code (Open/Closed Principle).'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'SpotAssignmentStrategyFactory and PricingStrategyFactory encapsulate creation and lookup of strategy implementations based on request parameters.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'ParkingLotRepository abstracts data access and concurrency locking away from the service layer, keeping business logic clean and testable.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring @Service, @Repository, and Strategy Factories operate as singletons to maintain a single consistent state across all requests.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'Services receive repository and strategy factories via Spring @Autowired constructor injection, maximizing decoupling and testability.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Each class has exactly one reason to change. ParkingLotService handles business logic (entry/exit rules, pricing). ParkingLotRepository handles data storage and retrieval. ParkingLotController handles HTTP mapping. Changes to pricing don\'t affect data storage, and vice versa.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new vehicle type requires only adding an enum constant and updating the switch statement — no structural changes. The system is open for extension (new types, new pricing) but closed for modification of core entry/exit flow. The Repository Pattern also allows swapping storage without modifying the service.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'High-level ParkingLotService depends on the ParkingLotRepository abstraction, not on concrete storage details. Spring injects the concrete repository at runtime. This allows switching from in-memory to database storage by implementing the same repository interface without changing business logic.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Gate validation logic is centralized in the service (getGate() + type check), not duplicated per endpoint. Spot occupancy logic is in repository.ocurrentSpot() and releaseSpot(), not scattered. Pricing rates are constants in one place, not magic numbers.'
    },
    {
      name: 'Encapsulation',
      description: 'All fields are private with getter/setter methods. The repository\'s internal maps are never exposed directly — only queried through controlled methods. The ticket\'s amount is only set by the service during exit, not mutable by external code.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Enum-based Type Dispatch',
      description: 'VehicleType enum (CAR/BIKE/TRUCK) drives both spot selection (which spots to search) and pricing (which rate to apply). The same code path handles all types via the enum value, without if-else chains.',
      alternative: 'Could use class hierarchy (Car extends Vehicle, Bike extends Vehicle) with getRate() method. Enum is chosen because vehicle types are fixed, finite, and don\'t have behavioral differences beyond rate/spot mapping. Enums are simpler, immutable, and switch-friendly.'
    },
    {
      name: 'Encapsulation — Data Hiding',
      description: 'Every class hides its internal state. ParkingLotRepository wraps ConcurrentHashMap behind semantic methods. ParkingSpot encapsulates occupancy with a setter that can add validation. Ticket prevents direct amount mutation from outside the service.',
      alternative: 'Could use public fields for simplicity (like a C struct). Encapsulation is chosen because it provides a controlled interface — the repository can add locks, validation, or logging without changing callers.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Floor contains a List of ParkingSpot (composition), not extends SpotCollection. ParkingLotRepository doesn\'t extend a base repository — it composes maps. Services delegate to repositories rather than inheriting data access.',
      alternative: 'Could use inheritance (Floor extends SpotCollection). Composition is chosen because it\'s more flexible — Floors can change their spot collection strategy (array, list, map) without changing the Floor class hierarchy.'
    },
    {
      name: 'Immutable Objects (Value Objects)',
      description: 'Ticket, Gate, Floor, and ParkingSpot are primarily value objects with most fields set at construction and only specific fields mutable (occupied, exitTime, amount). This reduces unexpected state changes.',
      alternative: 'Could make all fields mutable with setters. Limited mutability is chosen because it makes the data flow explicit — you can trace exactly where state changes happen (service.entry, service.exit) rather than mutations being scattered across code.'
    }
  ],
  extensibility: [
    {
      area: 'New Vehicle Types',
      description: 'Add a new constant to VehicleType enum, define spot count in ParkingLotInitializer, add rate constant in ParkingLotService, and add a new field in the frontend EntryForm vehicle type selector.',
      difficulty: 'Easy'
    },
    {
      area: 'Dynamic Pricing',
      description: 'Replace the switch statement with a PricingStrategy interface. Implementations: HourlyStrategy (current), DailyStrategy, WeekendStrategy, SurgeStrategy. The service delegates pricing to the strategy, making it trivial to add new pricing models.',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement a JpaParkingLotRepository that implements the same interface as ParkingLotRepository. Swap via Spring @Profile or @Primary. No changes needed in the service layer due to Dependency Injection.',
      difficulty: 'Medium'
    },
    {
      area: 'Reservation System',
      description: 'Add Reservation entity with time slot, add reserve() method to service. On entry, check for reservation instead of assigning any spot. Extends the existing flow without breaking entry/exit.',
      difficulty: 'Medium'
    },
    {
      area: 'Payment Gateway',
      description: 'Add PaymentService interface (Razorpay, Stripe, etc.). Call payment.process(amount) during exit before releasing the spot. The existing amount calculation remains unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'VIP / Reserved Spots',
      description: 'Add an isReserved flag to ParkingSpot. Modify occupySpot() to prefer unreserved spots first. Add reserveSpot() method. Frontend shows reserved spots differently.',
      difficulty: 'Easy'
    },
    {
      area: 'Analytics Dashboard',
      description: 'Add ParkingLotAnalyticsService that uses the existing repository methods to compute: peak hours, revenue reports, occupancy trends, average stay duration. No changes to core entry/exit flow.',
      difficulty: 'Medium'
    },
    {
      area: 'Multiple Parking Lots',
      description: 'Add ParkingLot entity with its own floors/spots/gates. Modify service to take parkingLotId parameter. Repository becomes a multi-lot store. Frontend adds lot selector.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Used Strategy Pattern + Factory over inline conditionals to adhere to Open-Closed Principle for future vehicle types and pricing rules.',
    'Chosen fine-grained ReentrantLock over synchronized methods to reduce thread contention across different floors and spots.',
    'In-memory ConcurrentHashMap eliminates DB overhead for lightning-fast sub-millisecond spot allocation.'
  ]
};

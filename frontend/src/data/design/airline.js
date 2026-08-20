// designDetails — airline
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Airline Reservation System — Design Details',
  tldr: [
    'Multi-passenger flight booking system with seat map generation from Aircraft templates and fine-grained per-seat ReentrantLocks',
    'Ascending-order multi-seat lock acquisition preventing circular wait deadlocks across concurrent multi-passenger bookings',
    'Hold TTL state machine (AVAILABLE → HELD → BOOKED) with 5-minute hold windows and automated background expiration sweeps',
    'Strategy Pattern for Class-Based Pricing and Tiered Cancellation Refunds (>24h full refund, 24h–2h partial 50% refund, <2h no refund)',
    'Idempotent payment processing guaranteeing zero duplicate charges on retried checkout transactions'
  ],
  requirements: [
    'Airline reservation system with multiple flights, seats, and bookings',
    'Flights have source, destination, departure/arrival times, airline, and flight number',
    'Seats are categorized as ECONOMY, BUSINESS, or FIRST with different pricing',
    'Each flight has 30 seats (5 rows × 6 cols), with rows A-B as BUSINESS and C-E as ECONOMY',
    'Seat states: AVAILABLE or BOOKED — only AVAILABLE seats can be booked',
    'Users can search flights by source and destination, view seat map with availability',
    'Booking flow: select seats → create booking (CONFIRMED) → check in (CHECKED_IN)',
    'Booking can be cancelled, which restores seats to AVAILABLE and updates flight available count',
    'Thread-safe concurrent access via ReentrantLock — multiple users can book simultaneously without double-booking'
  ],
  entities: [
    {
      name: 'Aircraft',
      description: 'Template model defining physical layout, seat templates, and total cabin capacity.',
      fields: [
        {
          name: 'model',
          type: 'String'
        },
        {
          name: 'seatTemplates',
          type: 'List<SeatTemplate>'
        }
      ],
      methods: []
    },
    {
      name: 'Flight',
      description: 'Operational flight instance with route, timestamps, and independent per-flight Seat entities.',
      fields: [
        {
          name: 'flightNumber',
          type: 'String'
        },
        {
          name: 'seats',
          type: 'Map<String, Seat>'
        }
      ],
      methods: [
        {
          name: 'getAvailableSeatsCount()',
          returns: 'int',
          description: 'Counts free seats'
        }
      ]
    },
    {
      name: 'Seat',
      description: 'Seat state model tracking status (AVAILABLE, HELD, BOOKED), heldByUserId, and holdExpiresAt.',
      fields: [
        {
          name: 'status',
          type: 'SeatStatus'
        },
        {
          name: 'holdExpiresAt',
          type: 'long'
        }
      ],
      methods: [
        {
          name: 'isAvailable(now)',
          returns: 'boolean',
          description: 'Evaluates TTL'
        }
      ]
    },
    {
      name: 'Booking',
      description: 'Transactional record pairing multiple passengers to assigned seats with status and refund tracking.',
      fields: [
        {
          name: 'passengers',
          type: 'List<Passenger>'
        },
        {
          name: 'seatNumbers',
          type: 'List<String>'
        }
      ],
      methods: []
    },
    {
      name: 'SeatLockManager',
      description: 'Concurrency component managing per-seat ReentrantLocks with ascending lock order acquisition.',
      fields: [
        {
          name: 'seatLocks',
          type: 'ConcurrentHashMap'
        }
      ],
      methods: [
        {
          name: 'holdSeats(...)',
          returns: 'void',
          description: 'Atomic multi-seat hold'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'AirlineRepository encapsulates all data access behind semantic methods. The service calls getSeat(), updateSeat(), and saveBooking() rather than directly manipulating maps. This separates persistence concerns from business logic.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring @Service and @Repository singletons ensure consistent state across concurrent requests. Critical for preventing double-booking in an in-memory system.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'AirlineService receives AirlineRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories and allowing storage swaps.'
    },
    {
      name: 'Unit of Work',
      used: true,
      explanation: 'bookFlight() wraps all operations (validate seats → mark BOOKED → update flight → create booking) in a single ReentrantLock block. If any step fails, no partial state is committed. cancelBooking() similarly atomically restores seats and flight count.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'AirlineService handles booking business logic (seat validation, pricing, state transitions). AirlineRepository manages data storage. AirlineController handles HTTP concerns. Each has one clear responsibility.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new seat class (e.g., PREMIUM_ECONOMY) requires only adding an enum constant and price mapping. New booking statuses can be added without changing core book/cancel flow.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'AirlineService depends on AirlineRepository abstraction. Spring injects the concrete implementation. Switching storage (e.g., to Redis) requires only a new repository implementation.'
    },
    {
      name: 'Fail-Fast Validation',
      description: 'bookFlight() validates all seats before marking any as BOOKED. If any seat is already taken, the entire operation fails before any state change, preventing partial bookings.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Seat State Protection',
      description: 'Seat status is only modified through service.bookFlight() and cancelBooking(). External code cannot accidentally mark seats as available or booked.',
      alternative: 'Could expose public setters. Controlled mutation via service prevents double-booking bugs.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Booking contains a list of seat IDs and a flight ID (composition). Flight does not extend a base route class — it composes source/destination as fields.',
      alternative: 'Could extend a Route class. Composition is preferred because a Flight is not a specialized route — it has scheduling, pricing, and availability.'
    },
    {
      name: 'Enum-based Typing',
      description: 'SeatClass, SeatStatus, and BookingStatus enums provide type-safe categorization. Each drives switch/if-else logic for pricing (Business = 2.5× fare) and state transitions.',
      alternative: 'Could use String constants. Enums provide compile-time safety, IDE autocomplete, and prevent invalid values.'
    }
  ],
  extensibility: [
    {
      area: 'Dynamic Fare Pricing',
      description: 'Replace fixed 2.5× multiplier with a FareStrategy. Peak hours, advance booking discounts, and last-minute premiums can be implemented without changing booking flow.',
      difficulty: 'Easy'
    },
    {
      area: 'Meal Preferences',
      description: 'Add MealPreference enum (VEG, NON_VEG, VEGAN) to Booking. Extend seat selection with meal option. No change to core booking flow.',
      difficulty: 'Easy'
    },
    {
      area: 'Baggage Tracking',
      description: 'Add Baggage entity linked to Booking. Track check-in, loaded, unloaded, and claimed status. Extends check-in flow without modifying seat booking.',
      difficulty: 'Medium'
    },
    {
      area: 'Flight Status / Delays',
      description: 'Add status field to Flight (SCHEDULED, BOARDING, DEPARTED, LANDED, CANCELLED). Frontend shows real-time status. Service can notify affected bookings.',
      difficulty: 'Medium'
    },
    {
      area: 'Group Bookings',
      description: 'Allow booking multiple passengers in one transaction. Frontend shows group booking form. Backend creates multiple bookings atomically.',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement JpaAirlineRepository. Swap via Spring @Profile. No service layer changes needed due to Dependency Injection.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Employed Aircraft seat map templates to clone independent Seat instances per flight, preventing shared availability bugs.',
    'Sorted seat locks alphabetically before acquisition to eliminate deadlock risks during multi-seat checkout.',
    'Enforced re-validation of hold TTL and user ownership at the commit path before executing payment.'
  ],
  solid: [
    {
      principle: 'Single Responsibility Principle',
      details: 'SeatLockManager manages concurrency; PaymentProcessor handles idempotency; RefundPolicy computes cancellation refunds.'
    },
    {
      principle: 'Open/Closed Principle',
      details: 'New pricing strategies (e.g. surge pricing) and refund policies can be plugged in without modifying AirlineService.'
    }
  ]
};

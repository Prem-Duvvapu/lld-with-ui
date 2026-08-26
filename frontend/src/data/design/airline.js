// designDetails — airline
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Airline Reservation System — Design Details',
  tldr: [
    'Multi-passenger flight booking with seat maps materialized per-flight from Aircraft templates and priced through a real Strategy at creation time',
    'Ascending-order multi-seat ReentrantLock acquisition (SeatLockManager) preventing circular-wait deadlocks across concurrent multi-passenger bookings',
    'Hold → Confirm → Release state machine (AVAILABLE → HELD → BOOKED) with a 5-minute hold TTL and a background sweep that reclaims stale holds',
    'Two independent Strategy families resolved by EnumMap factories: PricingStrategyFactory (STANDARD flat fare vs. DEMAND_SURGE dynamic pricing) and RefundPolicyFactory (FLEXIBLE tiered refund vs. BASIC non-refundable saver fare)',
    'Idempotent payment processing guaranteeing zero duplicate charges on retried checkout calls, and a repository layer isolating live state from the /sim/* sandbox'
  ],
  requirements: [
    'Airline reservation system with multiple aircraft, flights, seats and multi-passenger bookings',
    'Each Aircraft owns a fixed seat-template layout (class, window/aisle); each Flight clones that layout into its own independent Seat instances so two flights on the same aircraft never share seat state',
    'Seats are categorized ECONOMY, PREMIUM_ECONOMY, BUSINESS or FIRST, priced by a PricingStrategy resolved at flight-creation time — not a hardcoded per-model multiplier',
    'Seat lifecycle: AVAILABLE → HELD (5-minute TTL) → BOOKED, or HELD → AVAILABLE on release/expiry — a BOOKED seat can only return to AVAILABLE via a successful cancellation',
    'Users search flights by source/destination/date, hold seats, then confirm a multi-passenger booking under a chosen fare family (FLEXIBLE or BASIC)',
    'Cancelling a booking resolves its refund through the RefundPolicy tied to its fare type, never a single hardcoded policy',
    'Overbooking is rejected at two points: holdSeats refuses an already-HELD/BOOKED seat, and confirmSeats refuses to touch a seat that is already BOOKED by someone else instead of silently releasing it',
    'Thread-safe concurrent access via per-seat ReentrantLock with a fixed global lock order — many users can hold/book disjoint seats fully in parallel, and exactly one wins any contested seat'
  ],
  entities: [
    {
      name: 'Aircraft',
      description: 'Immutable template defining physical layout (SeatTemplate list) and total cabin capacity. Aircraft.of(...) defensively copies the template list so the layout cannot be mutated after registration.',
      fields: [
        { name: 'model', type: 'String' },
        { name: 'seatTemplates', type: 'List<SeatTemplate>' }
      ],
      methods: [
        { name: 'getTotalSeats()', returns: 'int', description: 'Template count' }
      ]
    },
    {
      name: 'Flight',
      description: 'Operational flight instance. Flight.create(...) materializes one independent Seat per SeatTemplate on the aircraft, pricing each through the PricingStrategy handed in — this is the one place seat prices are decided, replacing an earlier hardcoded per-class switch that duplicated (and silently overrode) the injected pricing Strategy.',
      fields: [
        { name: 'flightNumber', type: 'String' },
        { name: 'seats', type: 'ConcurrentHashMap<String, Seat>' }
      ],
      methods: [
        { name: 'getAvailableSeatsCount()', returns: 'int', description: 'Counts free-or-expired-hold seats' }
      ]
    },
    {
      name: 'Seat',
      description: 'Seat state model. status/heldByUserId/holdExpiresAt/version are all volatile — read outside any lock for display, only ever mutated inside SeatLockManager’s per-seat critical section.',
      fields: [
        { name: 'status', type: 'SeatStatus' },
        { name: 'holdExpiresAt', type: 'long' }
      ],
      methods: [
        { name: 'isAvailable(now)', returns: 'boolean', description: 'True if AVAILABLE, or HELD with an already-lapsed TTL' }
      ]
    },
    {
      name: 'Booking',
      description: 'Transactional record pairing passengers to seats, carrying the FareType that decides which RefundPolicy governs a future cancellation.',
      fields: [
        { name: 'passengers', type: 'List<Passenger>' },
        { name: 'fareType', type: 'FareType' }
      ],
      methods: []
    },
    {
      name: 'AirlineRepository',
      description: 'In-memory ConcurrentHashMap store for aircraft/flights/bookings, matching MovieTicketRepository/ConcertTicketRepository’s shape. Bare CRUD only — no business logic. The isolated /sim/* sandbox deliberately does not route through this class; it keeps its own inline maps in AirlineService since it seeds one fixed demo flight, not an open catalog.',
      fields: [
        { name: 'flights', type: 'ConcurrentHashMap<String, Flight>' },
        { name: 'bookingIdGen', type: 'AtomicLong' }
      ],
      methods: [
        { name: 'nextBookingId()', returns: 'String', description: 'Monotonic BK-#### id generator' }
      ]
    },
    {
      name: 'SeatLockManager',
      description: 'Concurrency component managing per-seat ReentrantLocks. Always acquires locks in ascending seat-number order regardless of the order the caller requested seats in — two passengers racing for {12A,12B} and {12B,12A} would otherwise deadlock (each holding the other’s first lock).',
      fields: [
        { name: 'seatLocks', type: 'ConcurrentHashMap<String, ReentrantLock>' }
      ],
      methods: [
        { name: 'holdSeats(...)', returns: 'void', description: 'Validates every requested seat then atomically holds all of them; rolls back any partial hold on failure' },
        { name: 'confirmSeats(...)', returns: 'void', description: 'Re-validates hold ownership/TTL; rejects (without mutating) a seat already BOOKED by someone else — the RCA-024 fix' }
      ]
    },
    {
      name: 'PricingStrategyFactory / RefundPolicyFactory',
      description: 'EnumMap-backed factories — the same shape as inventory.strategy.ReorderStrategyFactory. PricingStrategyFactory resolves PricingModel (STANDARD / DEMAND_SURGE) to a PricingStrategy at flight creation; RefundPolicyFactory resolves a Booking’s FareType (FLEXIBLE / BASIC) to a RefundPolicy at cancellation. Adding a model or fare family is one enum constant, one implementation, one constructor put — no branching added to AirlineService.',
      fields: [],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory (Pricing)',
      used: true,
      explanation: 'PricingStrategy has two real, interchangeable implementations: ClassBasedPricingStrategy (flat per-cabin-class fare) and DemandSurgePricingStrategy (same base fare scaled up the closer the flight is to departure — delegates to ClassBasedPricingStrategy rather than duplicating its table). PricingStrategyFactory resolves PricingModel to one via an EnumMap built once in its constructor. Flight.create(...) is the only caller — seat prices are never hardcoded on the model.'
    },
    {
      name: 'Strategy + Factory (Refunds)',
      used: true,
      explanation: 'RefundPolicy has two implementations: TieredCancellationRefundPolicy (100% ≥24h, 50% 24h–2h, 0% <2h — the FLEXIBLE fare) and NonRefundableFarePolicy (always 0% — the BASIC/saver fare). RefundPolicyFactory resolves a Booking’s FareType at cancelBooking() time, so two bookings on the identical flight/seat/timing can legitimately get different refunds.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'AirlineRepository encapsulates live aircraft/flight/booking storage behind save/find methods. AirlineService orchestrates business rules; it never reaches into a raw ConcurrentHashMap directly for live state.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'AirlineService is the single entrypoint the controller delegates to wholesale — seat holds, bookings, cancellations, and the isolated /sim/* sandbox all funnel through it, with SeatLockManager/PaymentProcessor/the two factories as its collaborators.'
    }
  ],
  principles: [
    {
      principle: 'Single Responsibility (SRP)',
      details: 'AirlineService orchestrates the booking workflow; SeatLockManager owns concurrency; PaymentProcessor owns idempotent charging; the two factories own strategy resolution; AirlineRepository owns live-state storage. AirlineController only translates HTTP.'
    },
    {
      principle: 'Open/Closed (OCP)',
      details: 'A new pricing model or fare family is one enum constant, one @Component implementation, and one line in the relevant factory’s constructor — AirlineService and its callers are never touched.'
    },
    {
      principle: 'Dependency Inversion (DIP)',
      details: 'AirlineService depends on the PricingStrategy/RefundPolicy interfaces and the AirlineRepository type, never a concrete strategy; Spring constructor-injects the real implementations, tests inject fakes/fresh instances directly.'
    },
    {
      principle: 'Fail-Fast Validation',
      details: 'holdSeats validates every requested seat is free before holding any of them; confirmSeats validates every seat’s hold ownership/TTL before confirming any of them. A failure at any seat rolls back the whole batch — never a partial hold or partial booking.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Seat State Protection',
      description: 'Seat.status/heldByUserId/holdExpiresAt are only ever mutated inside SeatLockManager’s per-seat lock. No other code path — including the controller — can flip a seat’s status directly.',
      alternative: 'Could expose a public setStatus() callable from anywhere. Routing every mutation through the lock manager is what makes the concurrency guarantees provable rather than assumed.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Flight composes an Aircraft (for layout) and a Map<String, Seat> (for live state) rather than extending a shared "Route" base class; DemandSurgePricingStrategy composes a ClassBasedPricingStrategy instance rather than duplicating its per-class table.',
      alternative: 'A Flight-extends-Route hierarchy would force every subclass to inherit scheduling/pricing fields it may not need. Composition keeps each concern swappable independently.'
    },
    {
      name: 'Enum-based Typing',
      description: 'SeatClass, SeatStatus, BookingStatus, PaymentStatus, FareType and PricingModel are all real enums, never string literals — FareType and PricingModel additionally double as EnumMap keys for their respective factories.',
      alternative: 'String constants would let a typo like "flexable" compile and silently resolve to a default policy instead of failing at compile time.'
    }
  ],
  extensibility: [
    {
      area: 'New Pricing Model',
      description: 'Implement PricingStrategy, annotate @Component, add one line to PricingStrategyFactory’s constructor and one PricingModel enum constant. No change to Flight or AirlineService.',
      difficulty: 'Easy'
    },
    {
      area: 'New Fare Family / Refund Policy',
      description: 'Implement RefundPolicy, annotate @Component, add one line to RefundPolicyFactory’s constructor and one FareType enum constant. bookFlight() and cancelBooking() need no changes.',
      difficulty: 'Easy'
    },
    {
      area: 'Meal Preferences',
      description: 'Add a MealPreference enum on Passenger. No change to the hold/confirm/cancel workflow.',
      difficulty: 'Easy'
    },
    {
      area: 'Baggage Tracking',
      description: 'Add a Baggage entity linked to Booking with its own check-in/loaded/claimed state, independent of seat booking.',
      difficulty: 'Medium'
    },
    {
      area: 'Flight Status / Delays',
      description: 'Add a FlightStatus field (SCHEDULED, BOARDING, DEPARTED, CANCELLED) to Flight; AirlineService can notify affected bookings on transition.',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement a JPA-backed AirlineRepository behind the same save/find method signatures; AirlineService, SeatLockManager and both factories are unaffected.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Materialize independent Seat instances per Flight from the Aircraft’s SeatTemplate layout, priced through a Strategy — prevents shared-availability bugs across flights on the same tail number and keeps pricing logic in exactly one place.',
    'Sort seat numbers ascending before acquiring locks (SeatLockManager) — a fixed global lock order eliminates deadlock risk on any multi-seat request regardless of the order seats were requested in.',
    'Re-validate hold ownership and TTL — and now explicitly reject an already-BOOKED seat without mutating it — at the confirm path before charging payment (RCA-024).',
    'Keep the /sim/* sandbox’s state as inline maps on AirlineService rather than a second AirlineRepository instance, since the sandbox always seeds one fixed demo flight rather than an open, growable catalog — a second repository instance would add ceremony without a behavioural difference here.'
  ]
};

// designDetails — carRental
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Car Rental — Design Details',
  requirements: [
    'Vehicle fleet management — add vehicles with make, model, year, license plate, category and branch; track odometer',
    'Vehicle lifecycle — AVAILABLE, RENTED, MAINTENANCE, RETIRED; only MAINTENANCE/RETIRED vehicles are excluded from new reservations (see the Vehicle Status Model tradeoff)',
    'Customer registration — customers register with name, license number and contact details before reserving',
    'Date-range reservation system — a customer reserves a specific vehicle for [startDate, endDate); the same vehicle may carry any number of reservations as long as no two date ranges overlap',
    'Branch-based fleet — vehicles are distributed across rental branches; search filters by branch and category',
    'Tiered pricing by duration — 1–2 days at the category base rate, 3–6 days at 10% off, 7+ days at 20% off, resolved by a Strategy + Factory pair',
    'Reservation lifecycle — PENDING (holds the calendar) → CONFIRMED (paid) → ACTIVE (picked up) → COMPLETED (returned), or CANCELLED from PENDING/CONFIRMED with a refund if already paid',
    'Late return handling — returning after the booked end date adds a late fee (1.5x the daily rate per extra day) to the actual cost',
    'Payment processing — CREDIT_CARD, DEBIT_CARD, WALLET, UPI, with authorize-on-confirm and refund-on-cancel flows'
  ],
  entities: [
    {
      name: 'CarRentalService',
      description: 'Facade orchestrating the whole module. Holds a second, isolated repository + lock service pair for the /sim/* sandbox, so the interactive demo can never touch live fleet or reservation data.',
      fields: [
        {
          name: 'lockService',
          type: 'ReservationLockService',
          description: 'Owns the per-vehicle locks that guard reservation creation'
        },
        {
          name: 'pricingFactory',
          type: 'PricingStrategyFactory',
          description: 'Resolves the duration-tiered pricing strategy for a rental'
        },
        {
          name: 'paymentProcessor',
          type: 'PaymentProcessor',
          description: 'Authorizes payment on confirm, refunds on cancel'
        }
      ],
      methods: [
        {
          name: 'reserveVehicle(customerId, vehicleId, start, end)',
          returns: 'Reservation',
          description: 'Prices the rental and delegates the atomic overlap-check-and-create to ReservationLockService'
        },
        {
          name: 'confirmReservation(reservationId, method)',
          returns: 'Reservation',
          description: 'Authorizes payment and moves PENDING → CONFIRMED'
        },
        {
          name: 'pickup(reservationId)',
          returns: 'Reservation',
          description: 'Moves CONFIRMED → ACTIVE, marks the vehicle RENTED'
        },
        {
          name: 'returnVehicle(reservationId, odometerReading, actualReturnDate)',
          returns: 'Reservation',
          description: 'Moves ACTIVE → COMPLETED, applies a late fee if returned after the booked end date, frees the vehicle'
        },
        {
          name: 'cancelReservation(reservationId)',
          returns: 'Reservation',
          description: 'Moves PENDING/CONFIRMED → CANCELLED and refunds any captured payment'
        }
      ]
    },
    {
      name: 'ReservationLockService',
      description: 'The concurrency core of the module. Serialises reservation creation per vehicle with a fair ReentrantLock acquired via computeIfAbsent, and re-reads the vehicle\'s full reservation set INSIDE the lock before deciding whether the new date range is free.',
      fields: [
        {
          name: 'vehicleLocks',
          type: 'Map<String, ReentrantLock>',
          description: 'One fair lock per vehicle id, created lazily via computeIfAbsent'
        }
      ],
      methods: [
        {
          name: 'reserve(vehicleId, customerId, start, end, cost, strategyName)',
          returns: 'Reservation',
          description: 'Under the vehicle\'s lock: re-reads all non-terminal reservations for the vehicle, rejects on any date overlap, otherwise creates and saves the new PENDING reservation — check and act as one atomic unit'
        },
        {
          name: 'markPickedUp(vehicleId) / markReturned(vehicleId, odometer)',
          returns: 'void',
          description: 'Flips the vehicle\'s display status under the same per-vehicle lock'
        }
      ]
    },
    {
      name: 'Vehicle',
      description: 'Rental vehicle with identification, category and fleet-level status. Its status is a display/fleet-gate concern only — per-date availability is answered by scanning its reservations, never by a single status flag (see the tradeoffs section).',
      fields: [
        { name: 'id', type: 'String', description: 'Unique vehicle identifier' },
        { name: 'make', type: 'String', description: 'Manufacturer (Honda, Toyota, Ford)' },
        { name: 'model', type: 'String', description: 'Model name' },
        { name: 'year', type: 'int', description: 'Manufacturing year' },
        { name: 'type', type: 'VehicleType', description: 'HATCHBACK, SEDAN, SUV, VAN, TRUCK — each carries its own base daily rate' },
        { name: 'status', type: 'VehicleStatus', description: 'AVAILABLE, RENTED, MAINTENANCE, RETIRED — only the latter two block new reservations' },
        { name: 'branchId', type: 'String', description: 'Branch the vehicle is based at' },
        { name: 'odometer', type: 'int', description: 'Current mileage reading, updated on return' }
      ],
      methods: []
    },
    {
      name: 'Customer',
      description: 'Renter with contact and licensing details.',
      fields: [
        { name: 'id', type: 'String', description: 'Unique customer identifier' },
        { name: 'name', type: 'String', description: 'Full name as on license' },
        { name: 'licenseNumber', type: 'String', description: 'Valid driving license identifier' },
        { name: 'email', type: 'String', description: 'Contact email' },
        { name: 'phone', type: 'String', description: 'Contact phone' }
      ],
      methods: []
    },
    {
      name: 'Reservation',
      description: 'Holds a vehicle for a customer over [startDate, endDate). PENDING and CONFIRMED reservations both occupy the vehicle\'s calendar — a reservation blocks overlapping dates from the moment it is created, not only once paid.',
      fields: [
        { name: 'id', type: 'String', description: 'Unique reservation identifier' },
        { name: 'customerId', type: 'String', description: 'Customer who made the reservation' },
        { name: 'vehicleId', type: 'String', description: 'Reserved vehicle' },
        { name: 'startDate / endDate', type: 'LocalDate', description: 'Half-open date range; same-day return + pickup does not overlap' },
        { name: 'status', type: 'ReservationStatus', description: 'PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED' },
        { name: 'estimatedCost / actualCost', type: 'double / Double', description: 'Priced at reservation time; actualCost includes any late fee, set on return' }
      ],
      methods: []
    },
    {
      name: 'RentalBranch',
      description: 'Physical location where vehicles are based and customers pick up/return cars.',
      fields: [
        { name: 'id', type: 'String', description: 'Unique branch identifier' },
        { name: 'name', type: 'String', description: 'Branch name' },
        { name: 'address', type: 'String', description: 'Physical address' },
        { name: 'city', type: 'String', description: 'City' }
      ],
      methods: []
    },
    {
      name: 'PricingStrategyFactory',
      description: 'Resolves the duration tier: 1–2 days → StandardPricingStrategy, 3–6 days → WeeklyDiscountPricingStrategy (10% off), 7+ days → LongRentalDiscountPricingStrategy (20% off).',
      fields: [],
      methods: [
        { name: 'forDuration(days)', returns: 'PricingStrategy', description: 'Picks the strategy for the tier the duration falls into' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory',
      used: true,
      explanation: 'PricingStrategy interface with StandardPricingStrategy, WeeklyDiscountPricingStrategy and LongRentalDiscountPricingStrategy, resolved by PricingStrategyFactory.forDuration(days). CarRentalService never branches on duration itself — adding a new tier is one new class plus one line in the factory.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'CarRentalService is the single entry point the controller talks to, coordinating ReservationLockService, PricingStrategyFactory and PaymentProcessor without the controller knowing any of them exist.'
    },
    {
      name: 'State (via typed enum)',
      used: true,
      explanation: 'ReservationStatus declares its own legal-transition table (PENDING→CONFIRMED→ACTIVE→COMPLETED, or →CANCELLED from the first two) and exposes canTransitionTo/allowedNext/isTerminal, so CarRentalService enforces the workflow through one transition() gate instead of ad-hoc status checks per method.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'CarRentalRepository wraps ConcurrentHashMaps per entity behind get/save/update methods, so ReservationLockService and CarRentalService never touch a Map directly.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'When a vehicle is returned and becomes free, interested customers waiting on that category/branch could be notified via an AvailabilityObserver without CarRentalService managing notification logic directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'CarRentalService orchestrates the workflow. ReservationLockService owns concurrency safety for the one contended invariant (no overlapping bookings). PricingStrategyFactory owns tier selection. PaymentProcessor owns authorize/refund. Each has exactly one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new vehicle category is one enum constant with its own base rate. A new pricing tier is one new PricingStrategy plus one line in the factory. Neither touches ReservationLockService or the reservation workflow.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'CarRentalService depends on the PricingStrategy interface via the factory, not on any concrete strategy. Swapping WeeklyDiscountPricingStrategy for a different discount curve requires no change to the service.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Date-overlap logic exists in exactly one place (ReservationLockService.overlaps), used identically by the live reservation path and the read-only availability search — the two can never silently drift apart.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any PricingStrategy (Standard, WeeklyDiscount, LongRentalDiscount) can substitute another without CarRentalService or the factory caring which one it got.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Pricing Strategies',
      description: 'CarRentalService calls calculateCost() on whichever PricingStrategy the factory returns for the duration. Adding a seasonal or loyalty tier is a new implementation, not a new branch in the service.',
      alternative: 'A single method with if/else per duration bracket would work but couples every future pricing rule to CarRentalService itself.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Reservation has-a customerId/vehicleId/branchId rather than extending a shared base. RentalBranch groups Vehicles by branchId rather than a class hierarchy per branch type.',
      alternative: 'A BaseEntity superclass was considered and rejected — the relationships here are references between independent aggregates, not is-a relationships.'
    },
    {
      name: 'Encapsulation — Reservation Transitions',
      description: 'ReservationStatus.canTransitionTo() is the only place that knows which moves are legal. CarRentalService.transition() is the only call site that mutates status, so an ACTIVE reservation can never be cancelled or a COMPLETED one reopened.',
      alternative: 'A bare setStatus() setter was rejected — it would let any caller skip the workflow and land a reservation in an inconsistent state.'
    }
  ],
  extensibility: [
    {
      area: 'New Vehicle Category',
      description: 'Add a constant to VehicleType with its base daily rate. No structural change to reservation, pricing tier selection, or the lock service.',
      difficulty: 'Easy'
    },
    {
      area: 'Seasonal Pricing',
      description: 'Add a SeasonalPricingStrategy and let PricingStrategyFactory consider the reservation month alongside duration — the factory signature grows, PricingStrategy itself does not change.',
      difficulty: 'Medium'
    },
    {
      area: 'One-Way Rental',
      description: 'Allow returning to a different branch: add a dropBranchId to Reservation, and on return move the vehicle\'s branchId to it. Pricing would add a one-way surcharge tier.',
      difficulty: 'Medium'
    },
    {
      area: 'Waitlist / Availability Notifications',
      description: 'Add an AvailabilityObserver notified from ReservationLockService.markReturned() and from cancelReservation(), so customers watching a fully-booked category/branch hear about the opening first.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Vehicle Status Model: the original draft of this design used AVAILABLE/RESERVED/RENTED/MAINTENANCE/RETIRED as a single per-vehicle gate. That breaks the moment one vehicle carries two non-overlapping future reservations — flipping the vehicle to RESERVED after the first booking would incorrectly block the second. VehicleStatus was cut down to AVAILABLE/RENTED/MAINTENANCE/RETIRED: only MAINTENANCE/RETIRED gate new reservations; AVAILABLE/RENTED are cosmetic mirrors of "is there an ACTIVE reservation right now", and the real per-date gate is always the reservation-set overlap scan.',
    'Per-vehicle lock granularity: a single global reservation lock would be simplest but would serialise every booking across the entire fleet, including two customers booking two completely different vehicles. Per-vehicle ReentrantLocks (keyed via computeIfAbsent, same idiom as uber\'s DriverAssignmentService) let disjoint reservations proceed fully in parallel, at the cost of one lock object per vehicle for the life of the process.',
    'PENDING already blocks the calendar: a reservation could instead only occupy the calendar once CONFIRMED (paid), giving a customer a payment window without risking losing the vehicle. That was rejected — it reopens exactly the race this module exists to close, since a second customer could reserve the same still-unpaid dates during that window. PENDING and CONFIRMED are both treated as calendar-blocking; the tradeoff is a customer who never pays holds the vehicle until they cancel or an admin does.',
    'No persistent hold TTL: unlike movie-ticket\'s 5-minute seat hold, a PENDING car reservation does not auto-expire. Vehicles are a scarcer, higher-value resource booked further in advance, so an unpaid PENDING reservation is treated as a real hold requiring explicit cancellation rather than a timed lock.'
  ],
  summary: 'Fleet-and-branch car rental with date-range reservations, tiered duration pricing (Strategy + Factory), and a CarRentalService facade over an isolated simulation sandbox. The defining engineering problem is not "is this vehicle free" as a boolean but "does this date range overlap any of this vehicle\'s existing reservations" — answered by a per-vehicle ReentrantLock that re-reads and re-scans the whole reservation set inside the critical section before committing a new one.',
  highlights: [
    'Per-vehicle ReentrantLock (computeIfAbsent) serialising reservation creation, with the full reservation set re-read and re-scanned for date overlap INSIDE the lock — not a boolean check-then-act, a set-membership check-then-act.',
    'ReservationStatus declares its own transition table (PENDING→CONFIRMED→ACTIVE→COMPLETED, CANCELLED from the first two) enforced through a single transition() gate in CarRentalService.',
    'Strategy + Factory tiered pricing: PricingStrategyFactory.forDuration(days) picks Standard / WeeklyDiscount(10%) / LongRentalDiscount(20%) without CarRentalService ever branching on duration.',
    'Isolated /api/car-rental/sim/* engine backed by its own CarRentalRepository + ReservationLockService instance, so the interactive demo can race threads against sandbox vehicles without any risk to live reservations.'
  ]
};

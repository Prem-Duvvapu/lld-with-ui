// designDetails — hotel
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — the previous version predated a refactor: it described a
// 4-value BookingStatus (CONFIRMED/CHECKED_IN/CHECKED_OUT/CANCELLED), a RoomStatus that included
// BOOKED/OCCUPIED as room-wide flags, a single lock field directly on HotelService/HotelRepository,
// and proposed a future "PricingStrategy interface" for dynamic pricing that had, by the time this
// was written, already shipped as TariffStrategy. The real module answers "is this room free" per
// date range (never from a room-wide flag), delegates all booking-lifecycle locking to
// RoomBookingService, and prices/refunds through two real Strategy families.

export default {
  title: 'Hotel Management — Design Details',
  requirements: [
    'Hotel management system with multiple hotels, each with its own set of rooms',
    'Rooms are categorized as SINGLE, DOUBLE, SUITE, or DELUXE, each with its own nightly price',
    'A room\'s RoomStatus is only ever AVAILABLE (bookable) or MAINTENANCE (not bookable at all) — there is no room-wide "booked"/"occupied" flag',
    '"Is this room free" is answered per date range: a booking request overlaps against every reservation still holding that room (PENDING/CONFIRMED/CHECKED_IN), never a single status field',
    'Reservation lifecycle: PENDING → CONFIRMED (committed atomically inside the same booking call) → CHECKED_IN → CHECKED_OUT, with CANCELLED reachable from PENDING/CONFIRMED/CHECKED_IN and NO_SHOW from CONFIRMED — every other transition is rejected by ReservationStatus\'s own transition table',
    'Pricing — a stay is priced by TariffStrategyFactory: a flat per-night rate, or a Friday/Saturday-night surcharge if the stay touches at least one such night',
    'Cancellation refunds — CancellationRefundStrategyFactory resolves how much comes back purely from how much notice was given: 3+ days before check-in is a full refund, less than 3 days (but before check-in) is a 50% refund, on/after check-in or a no-show is no refund',
    'Thread-safe booking — two guests racing to book overlapping dates on the same room must produce exactly one winner, the other rejected, never both confirmed'
  ],
  entities: [
    {
      name: 'HotelService',
      description: 'Facade the controller delegates to wholesale. Owns hotel/room lookups and translates repository state into API-shaped results; every booking-lifecycle mutation is delegated to RoomBookingService, which owns the actual locking.',
      fields: [
        {
          name: 'repository',
          type: 'HotelRepository',
          description: 'Hotel/room/booking storage, injected via constructor'
        },
        {
          name: 'bookingService',
          type: 'RoomBookingService',
          description: 'Owns per-room locking and every state transition — HotelService never mutates a Booking or Room directly'
        }
      ],
      methods: [
        {
          name: 'getAvailableRooms(hotelId, checkIn, checkOut)',
          returns: 'List<Room>',
          description: 'Filters the hotel\'s rooms through RoomBookingService.isAvailable() for the requested date range — not a static AVAILABLE-status filter'
        },
        {
          name: 'bookRoom / checkIn / checkOut / cancelBooking / markNoShow',
          returns: 'Booking',
          description: 'Each is a thin delegate to the matching RoomBookingService method'
        }
      ]
    },
    {
      name: 'RoomBookingService',
      description: 'Serialises every mutation of a room\'s booking calendar under a per-room ReentrantLock (fair, so a contended room serves requests in arrival order) so two guests can never be confirmed into overlapping dates. The room\'s active reservations are re-read and re-checked for overlap INSIDE the lock, not before it — a snapshot taken before acquiring the lock can already be stale by the time the lock is granted.',
      fields: [
        {
          name: 'roomLocks',
          type: 'ConcurrentMap<String, ReentrantLock>',
          description: 'One fair lock per roomId, created lazily via computeIfAbsent'
        },
        {
          name: 'tariffStrategyFactory, refundStrategyFactory',
          type: 'TariffStrategyFactory, CancellationRefundStrategyFactory',
          description: 'Resolve pricing at booking time and refund amount at cancellation/no-show time'
        }
      ],
      methods: [
        {
          name: 'book(roomId, userId, guestName, checkIn, checkOut)',
          returns: 'Booking',
          description: 'Under the room\'s lock: rejects a MAINTENANCE room or an overlapping active reservation, prices the stay via TariffStrategyFactory, creates the booking PENDING, then transitions it to CONFIRMED inside the same locked section — the availability check and the commit are one atomic step'
        },
        {
          name: 'cancel(bookingId, cancellationDate) / markNoShow(bookingId)',
          returns: 'Booking',
          description: 'Transitions the booking, then resolves and records a RefundResult via CancellationRefundStrategyFactory'
        },
        {
          name: 'isAvailable(roomId, checkIn, checkOut)',
          returns: 'boolean',
          description: 'True when the room is AVAILABLE (not MAINTENANCE) and no active reservation for it overlaps the requested range'
        }
      ]
    },
    {
      name: 'HotelRepository',
      description: 'In-memory store. hotels/rooms only change at seed time and hold a plain map; bookings is written continuously from concurrent requests and stays a ConcurrentHashMap.',
      fields: [
        {
          name: 'hotels, rooms, bookings',
          type: 'Map<String, T>',
          description: 'One map per aggregate, keyed by id'
        },
        {
          name: 'bookingCounter',
          type: 'AtomicInteger',
          description: 'Backs generateBookingId() ("HBK-00001" style)'
        }
      ],
      methods: [
        {
          name: 'findActiveBookingsForRoom(roomId)',
          returns: 'List<Booking>',
          description: 'Every booking for roomId whose status.holdsRoom() is true — the set a new booking attempt checks for date overlap; must be called AFTER acquiring the room\'s lock, never before, or the read is stale by the time it is acted on'
        }
      ]
    },
    {
      name: 'ReservationStatus',
      description: 'Declares its own legal-transition table (canTransitionTo/allowedNext), the same pattern as uber.model.RideStatus, rather than leaving each service method to decide for itself which source statuses it accepts. holdsRoom() answers whether a booking in this status still occupies the room\'s calendar for its date range.',
      fields: [],
      methods: []
    },
    {
      name: 'TariffStrategy',
      description: 'Strategy interface for turning a room and a stay into a price. TariffStrategyFactory.resolve() picks WeekendTariffStrategy whenever the stay touches at least one Friday or Saturday night, StandardTariffStrategy otherwise — so a five-night stay that only touches one weekend night is not charged the surcharge for the whole stay.',
      fields: [],
      methods: [
        {
          name: 'calculateTariff(room, checkIn, checkOut)',
          returns: 'double',
          description: 'StandardTariffStrategy: room.price × nights. WeekendTariffStrategy: prices night-by-night, applying a 1.25× surcharge only to Friday/Saturday nights.'
        }
      ]
    },
    {
      name: 'CancellationRefundStrategy',
      description: 'Strategy interface for how much of a booking\'s total comes back on cancellation. CancellationRefundStrategyFactory.resolve() picks purely from days-until-check-in and whether the booking is a no-show — RoomBookingService never encodes a refund rule itself.',
      fields: [],
      methods: [
        {
          name: 'calculateRefund(booking, cancellationDate)',
          returns: 'RefundResult',
          description: 'FullRefundStrategy (3+ days notice): full amount. PartialRefundStrategy (less than 3 days, before check-in): 50%. NoRefundStrategy (on/after check-in, or NO_SHOW): 0.'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'Two independent Strategy families: TariffStrategy (Standard vs. Weekend surcharge), resolved by date range, and CancellationRefundStrategy (Full/Partial/None), resolved by notice given. Neither RoomBookingService method hard-codes a pricing or refund rule.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'ReservationStatus declares its own legal-transition map (canTransitionTo/allowedNext) rather than leaving bookRoom/checkIn/checkOut/cancel to each independently decide which source statuses they accept — the exact class of bug the accompanying javadoc says the previous 4-status model had.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'HotelRepository is the only class touching the hotels/rooms/bookings maps; HotelService and RoomBookingService both go through it rather than holding their own storage.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'HotelService is the single entry point the controller calls; it composes RoomBookingService for all lifecycle mutation rather than the controller wiring both directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'RoomBookingService owns per-room locking and every status transition. HotelRepository owns storage only. TariffStrategyFactory/CancellationRefundStrategyFactory each own one pricing decision. HotelService composes them for lookups and delegation.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new pricing rule (e.g. a seasonal rate) is a new TariffStrategy implementation plus one more branch in TariffStrategyFactory.resolve() — RoomBookingService.book() does not change.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'RoomBookingService depends on the TariffStrategy/CancellationRefundStrategy interfaces, not on any concrete implementation — Spring injects whichever beans exist, and the factories resolve at call time.'
    },
    {
      name: 'Encapsulation',
      description: 'ReservationStatus keeps its transition table a private static final map, exposing only canTransitionTo()/allowedNext()/holdsRoom() — RoomBookingService calls canTransitionTo() before every mutation instead of comparing enum ordinals itself.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Availability Is Never a Single Flag',
      description: 'RoomStatus only distinguishes AVAILABLE/MAINTENANCE. "Is this room free for these dates" is always answered by checking Booking.overlaps() against findActiveBookingsForRoom(), never by reading a room-wide booked/occupied flag.',
      alternative: 'An earlier revision used a single RoomStatus.BOOKED flag — the first booking for ANY future date blocked every other date range on that room until one checkout. Per-date-range overlap checking is what makes multiple non-overlapping future bookings on the same room possible at all.'
    },
    {
      name: 'Composition — Service Delegation',
      description: 'HotelService has-a RoomBookingService rather than inheriting or reimplementing its locking; each can be tested independently (RoomBookingService\'s concurrency tests never need HotelService at all).',
      alternative: 'Could fold booking-lifecycle locking directly into HotelService as private methods — composition keeps the one class that must reason about concurrency in its own file with its own tests.'
    },
    {
      name: 'Polymorphism — Two Independent Strategy Families',
      description: 'RoomBookingService.book() calls tariffStrategyFactory.resolve(...).calculateTariff(...) and, on cancellation, refundStrategyFactory.resolve(...).calculateRefund(...) — against interfaces, never switching on a strategy name itself.',
      alternative: 'Could use an if/else per pricing or refund rule inline in RoomBookingService — polymorphism keeps each rule\'s math in its own class with its own unit tests.'
    }
  ],
  extensibility: [
    {
      area: 'Seasonal / Holiday Pricing',
      description: 'A new SeasonalTariffStrategy implementing TariffStrategy, with TariffStrategyFactory.resolve() checking a holiday calendar before falling back to the weekend/standard rules — RoomBookingService.book() is unaffected.',
      difficulty: 'Easy'
    },
    {
      area: 'Room Transfer',
      description: 'Moving a guest between rooms mid-stay needs two room locks held at once — RoomBookingService\'s own javadoc already documents the convention for this (acquire in ascending room-id order, matching zomato.DeliveryAssignmentService\'s order-then-agent locks) even though nothing in the module needs two locks today.',
      difficulty: 'Medium'
    },
    {
      area: 'Multi-Room / Group Bookings',
      description: 'Booking today is always exactly one room. A group booking would need to acquire every room\'s lock (in a fixed order, per the convention above) and roll back every room\'s reservation if any one of them fails its overlap check.',
      difficulty: 'Hard'
    },
    {
      area: 'Database Persistence',
      description: 'Swap HotelRepository\'s in-memory maps for a JPA-backed implementation behind the same method signatures — RoomBookingService and HotelService need no change since they only ever call the repository\'s interface-shaped methods.',
      difficulty: 'Medium'
    }
  ]
};

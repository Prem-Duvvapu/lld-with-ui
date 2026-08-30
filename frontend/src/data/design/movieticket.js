// designDetails — movieticket
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Movie Ticket Booking — Design Details',
  requirements: [
    'Movie ticket booking system with movies, shows, seats, and bookings',
    'Multiple movies each with multiple shows across different screens and time slots',
    'Seats are categorized as Gold (₹350, rows 1-2) or Silver (₹200, rows 3-4)',
    'Users can browse movies, view show timings, and see seat availability',
    'Booking seats marks them as unavailable and updates available seat count',
    'Cancellation restores seat availability and updates show counts',
    'Thread-safe concurrent access — multiple users can book simultaneously without double-booking'
  ],
  entities: [
    {
      name: 'MovieTicketService',
      description: 'Core business logic for movie browsing and seat booking. Handles seat selection, booking creation, and cancellation with thread-safe operations.',
      fields: [
        {
          name: 'repository',
          type: 'MovieTicketRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'seatLockManager',
          type: 'SeatLockManager',
          description: 'Per-seat ReentrantLocks (fair, ascending-id acquisition) guarding hold/confirm/release/cancel'
        },
        {
          name: 'pricingStrategyFactory',
          type: 'PricingStrategyFactory',
          description: 'Resolves BasePricingStrategy vs SurgePricingStrategy per show, classified by showTime'
        },
        {
          name: 'idempotencyCache',
          type: 'ConcurrentHashMap<String, Booking>',
          description: 'Idempotency-key -> Booking, so a retried bookSeats call returns the original result'
        },
        {
          name: 'bookingLocks',
          type: 'ConcurrentHashMap<Long, ReentrantLock>',
          description: 'Per-booking lock guarding cancelBooking\'s status check + availableSeats increment (RCA-035)'
        },
        {
          name: 'simRepository, simSeatLockManager, simEventLog',
          type: 'MovieTicketRepository, SeatLockManager, List<SimEvent>',
          description: 'A second, fully independent repository/lock-manager pair backing /sim/* so the demo can never touch a real show'
        }
      ],
      methods: [
        {
          name: 'getMovies()',
          returns: 'List<Movie>',
          description: 'Returns all movies in the system'
        },
        {
          name: 'getShows(movieId)',
          returns: 'List<Show>',
          description: 'Returns all shows for a given movie'
        },
        {
          name: 'getSeats(showId)',
          returns: 'List<Seat>',
          description: 'Expires stale holds, then returns all seats for a show with current availability'
        },
        {
          name: 'holdSeats(showId, seatIds, userId)',
          returns: 'Map<String, Object>',
          description: 'Locks every requested seat in ascending id order, validates all are available, then holds all of them (5-minute TTL) — all-or-nothing'
        },
        {
          name: 'bookSeats(showId, seatIds, userId, method, key)',
          returns: 'Booking',
          description: 'Confirms held seats, charges via MovieTicketPaymentProcessor, and caches the result under the idempotency key if one was supplied'
        },
        {
          name: 'cancelBooking(bookingId)',
          returns: 'Booking',
          description: 'Locked per booking id (RCA-035): marks the booking CANCELLED, restores the show\'s availableSeats, and releases the seats'
        }
      ]
    },
    {
      name: 'MovieTicketRepository',
      description: 'In-memory data store — one ConcurrentHashMap per entity type, plus an AtomicLong id generator each.',
      fields: [
        {
          name: 'movies, theaters, screens, shows, bookings',
          type: 'ConcurrentHashMap<Long, ...>',
          description: 'One map per entity type, keyed by generated id'
        },
        {
          name: 'showSeats',
          type: 'ConcurrentHashMap<Long, Map<Long, Seat>>',
          description: 'Seats indexed per show — a seat id only resolves under the show it actually belongs to, never globally'
        },
        {
          name: 'users',
          type: 'ConcurrentHashMap<String, User>',
          description: 'Seeded demo users, keyed by string id'
        },
        {
          name: 'movieIdGen, theaterIdGen, screenIdGen, showIdGen, seatIdGen, bookingIdGen',
          type: 'AtomicLong',
          description: 'One monotonic id sequence per entity type; all reset together by clear()'
        }
      ],
      methods: [
        {
          name: 'seedInitialData()',
          returns: 'void',
          description: 'Clears everything, then seeds 4 users, 3 movies, 2 theaters/3 screens, and 6 shows (2 per movie) with a full 24-seat grid each'
        },
        {
          name: 'createShowWithSeats(movieId, theaterId, screenId, screenName, showTime, date)',
          returns: 'long',
          description: 'Builds a new show\'s 4x6 seat grid via SeatFactory (rows 1-2 GOLD, rows 3-4 SILVER) and registers the show'
        },
        {
          name: 'findSeatById(showId, seatId)',
          returns: 'Seat',
          description: 'Looks a seat up within its own show\'s index only'
        },
        {
          name: 'saveBooking(booking)',
          returns: 'Booking',
          description: 'Upserts a booking by id'
        }
      ]
    },
    {
      name: 'Movie',
      description: 'Represents a movie with metadata.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique identifier'
        },
        {
          name: 'title',
          type: 'String',
          description: 'Movie title'
        },
        {
          name: 'genre',
          type: 'String',
          description: 'Genre (Sci-Fi, Action, etc.)'
        },
        {
          name: 'duration',
          type: 'int',
          description: 'Duration in minutes'
        },
        {
          name: 'rating',
          type: 'double',
          description: 'IMDB-style rating out of 10'
        }
      ],
      methods: []
    },
    {
      name: 'Show',
      description: 'A specific screening of a movie at a given time and screen.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique identifier'
        },
        {
          name: 'movieId',
          type: 'long',
          description: 'Which movie is playing'
        },
        {
          name: 'screen',
          type: 'String',
          description: 'Screen name (Screen 1, Screen 2, etc.)'
        },
        {
          name: 'showTime',
          type: 'String',
          description: 'Time of show ("10:00 AM", "07:00 PM", etc.) — also what PricingStrategyFactory classifies as STANDARD or PEAK'
        },
        {
          name: 'availableSeats',
          type: 'int',
          description: 'Currently available seats (decremented on booking)'
        },
        {
          name: 'totalSeats',
          type: 'int',
          description: 'Total seats (24 per show: 4 rows × 6 cols)'
        }
      ],
      methods: []
    },
    {
      name: 'Seat',
      description: 'A single seat in the cinema with type, pricing and hold/booking state.',
      fields: [
        {
          name: 'id, showId, row, col',
          type: 'long, long, int, int',
          description: 'Identity — a seat id only means something within its own show'
        },
        {
          name: 'seatType',
          type: 'SeatType',
          description: 'GOLD (rows 1-2) or SILVER (rows 3-4); getType()/setType(String) mirror it as a plain string'
        },
        {
          name: 'price',
          type: 'double',
          description: 'Gold: ₹350, Silver: ₹200 by default (SeatFactory), or a peak-show surcharge via PricingStrategyFactory'
        },
        {
          name: 'status',
          type: 'SeatStatus',
          description: 'AVAILABLE, HELD or BOOKED; isAvailable()/setAvailable(boolean) mirror it as a derived boolean'
        },
        {
          name: 'heldByUserId, holdExpiresAt',
          type: 'String, long',
          description: 'Who currently holds this seat and when that hold\'s TTL elapses'
        },
        {
          name: 'version',
          type: 'long',
          description: 'Incremented on every state change — a hook for optimistic-concurrency checks, not currently enforced'
        }
      ],
      methods: []
    },
    {
      name: 'Booking',
      description: 'A confirmed seat booking with payment details.',
      fields: [
        {
          name: 'id, showId, seatIds, userId',
          type: 'long, long, List<Long>, String',
          description: 'Identity: which show, which seats, and who booked them'
        },
        {
          name: 'bookingStatus',
          type: 'BookingStatus',
          description: 'PENDING, CONFIRMED or CANCELLED; getStatus()/setStatus(String) mirror it as a plain string'
        },
        {
          name: 'paymentMethod',
          type: 'PaymentMethod',
          description: 'UPI, CREDIT_CARD, DEBIT_CARD or NET_BANKING'
        },
        {
          name: 'totalAmount',
          type: 'double',
          description: 'Sum of all booked seats\' resolved prices at booking time'
        },
        {
          name: 'bookingTime',
          type: 'LocalDateTime',
          description: 'When the booking was made'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'BasePricingStrategy and SurgePricingStrategy compute seat prices dynamically; PricingStrategyFactory (an EnumMap<PricingTier, PricingStrategy>) resolves which one applies per Show by classifying its showTime — 5 PM or later gets the surge strategy\'s markup, everything else gets base pricing. SurgePricingStrategy was dead code before this factory existed: the service used to construct BasePricingStrategy directly, so nothing ever selected the surge strategy at runtime.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'SeatFactory creates Seat instances with predefined row/col layouts and prices per seat type, now actually called from MovieTicketRepository#createShowWithSeats (it previously existed but every show\'s seats were constructed inline, bypassing it entirely).'
    },
    {
      name: 'Observer Pattern',
      used: true,
      explanation: 'SeatMapNotifier publishes seat status changes to SeatAvailabilityObserver instances.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring manages MovieTicketService and SeatLockManager as singletons.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'MovieTicketService handles booking business logic (seat validation, pricing). Repository manages all data storage. Controller handles HTTP concerns. Each has a clear, single responsibility.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new seat tier (e.g., VIP ₹500) requires only adding the seat type and price — no service changes. New cancellation policies can be added without modifying core booking flow.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Service depends on repository abstraction. Spring injects the concrete implementation. Switching storage (e.g., to Redis) requires only a new repository.'
    },
    {
      name: 'Fail-Fast Validation',
      description: 'Booking validates all seats before marking any as unavailable. If seat #3 is already booked, the entire operation fails before any state change, preventing partial bookings.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Per-seat locks and atomic status transitions are encapsulated inside SeatLockManager.'
    },
    {
      name: 'Polymorphism',
      description: 'Pricing strategies calculate seat costs polymorphically based on seat type and surge factors.'
    },
    {
      name: 'Abstraction',
      description: 'Clean REST endpoints expose movie browsing, show selection, seat holding, booking, and simulation replay.'
    }
  ],
  extensibility: [
    {
      area: 'Multiple Theaters',
      description: 'Add Theater entity containing screens and shows. Each Theater has its own seat layout. MovieTicketService takes theaterId parameter.',
      difficulty: 'Medium'
    },
    {
      area: 'Food & Beverage Addon',
      description: 'Add FnbItem and FnbOrder entities. Extend Booking with optional food items. Calculate additional amount during booking.',
      difficulty: 'Medium'
    },
    {
      area: 'Loyalty Program',
      description: 'Add User entity with loyalty points. Points earned per booking (₹1 = 1 point). Redeem points for discounts on future bookings.',
      difficulty: 'Easy'
    },
    {
      area: 'Demand-Based Dynamic Pricing',
      description: 'PricingStrategyFactory currently classifies a show as PEAK purely by its fixed showTime (5 PM or later). A DemandSurgePricingStrategy could instead read the show\'s live occupancy percentage (seats booked / totalSeats) and scale the multiplier continuously — a near-empty peak-hour show and a nearly-sold-out matinee would price very differently instead of both falling into the same coarse bucket.',
      difficulty: 'Medium'
    },
    {
      area: 'Optimistic Concurrency on Seat.version',
      description: 'Seat#version already increments on every state change but nothing reads it back — SeatLockManager\'s per-seat ReentrantLock is what actually prevents double-booking today. A client could instead send back the version it last saw with its hold/confirm request, and the service could reject a stale write with a 409 even before touching the lock, giving a faster, more specific error for the common "the seat map on your screen is out of date" case.',
      difficulty: 'Medium'
    }
  ]
};

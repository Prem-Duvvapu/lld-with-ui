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
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic booking and cancellation operations'
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
          description: 'Returns all seats for a show with availability'
        },
        {
          name: 'bookSeats(showId, seatIds, userId)',
          returns: 'Booking',
          description: 'Validates and books selected seats — thread safe'
        },
        {
          name: 'cancelBooking(bookingId)',
          returns: 'Booking',
          description: 'Cancels booking, restores seats and show availability'
        }
      ]
    },
    {
      name: 'MovieTicketRepository',
      description: 'In-memory data store with ConcurrentHashMap and ReentrantLock for thread safety.',
      fields: [
        {
          name: 'movies',
          type: 'ConcurrentHashMap<Long, Movie>',
          description: 'All movies indexed by ID'
        },
        {
          name: 'shows',
          type: 'ConcurrentHashMap<Long, Show>',
          description: 'All shows indexed by ID'
        },
        {
          name: 'seats',
          type: 'ConcurrentHashMap<Long, Seat>',
          description: 'All seats indexed by ID'
        },
        {
          name: 'bookings',
          type: 'ConcurrentHashMap<Long, Booking>',
          description: 'All bookings indexed by ID'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic write operations'
        }
      ],
      methods: [
        {
          name: 'getMovies()',
          returns: 'List<Movie>',
          description: 'Returns all movies'
        },
        {
          name: 'getShowsByMovie(movieId)',
          returns: 'List<Show>',
          description: 'Filters shows by movie'
        },
        {
          name: 'saveBooking(booking)',
          returns: 'Booking',
          description: 'Thread-safe booking save'
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
          description: 'Time of show (10:00 AM, 2:00 PM, etc.)'
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
      description: 'A single seat in the cinema with type and pricing.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique identifier'
        },
        {
          name: 'row',
          type: 'int',
          description: 'Row number (1-4)'
        },
        {
          name: 'col',
          type: 'int',
          description: 'Column number (1-6)'
        },
        {
          name: 'type',
          type: 'String',
          description: 'Gold (rows 1-2) or Silver (rows 3-4)'
        },
        {
          name: 'price',
          type: 'double',
          description: 'Gold: ₹350, Silver: ₹200'
        },
        {
          name: 'available',
          type: 'boolean',
          description: 'Whether the seat is free to book'
        }
      ],
      methods: []
    },
    {
      name: 'Booking',
      description: 'A confirmed seat booking with payment details.',
      fields: [
        {
          name: 'id',
          type: 'long',
          description: 'Unique identifier'
        },
        {
          name: 'showId',
          type: 'long',
          description: 'Which show this booking is for'
        },
        {
          name: 'seatIds',
          type: 'List<Long>',
          description: 'List of booked seat IDs'
        },
        {
          name: 'userId',
          type: 'String',
          description: 'Who made the booking'
        },
        {
          name: 'status',
          type: 'String',
          description: 'BOOKED or CANCELLED'
        },
        {
          name: 'totalAmount',
          type: 'double',
          description: 'Sum of all booked seat prices'
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
      explanation: 'BasePricingStrategy and SurgePricingStrategy compute seat prices dynamically.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'SeatFactory creates Seat instances with predefined row/col layouts and prices per seat type.'
    },
    {
      name: 'Observer Pattern',
      used: true,
      explanation: 'SeatMapNotifier publishes seat status changes to SeatAvailabilityObserver instances.'
    },
    {
      name: 'State Pattern',
      used: true,
      explanation: 'SeatStatus enum (AVAILABLE, HELD, BOOKED) enforces valid state transitions.'
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
      area: 'Dynamic Seat Pricing',
      description: 'Replace fixed pricing with a PricingStrategy. Peak hours (evening shows) cost more. Weekends have premium pricing.',
      difficulty: 'Medium'
    },
    {
      area: 'Multiple Parking Lots',
      description: 'Add ParkingLot entity with its own floors/spots/gates. Modify service to take parkingLotId parameter. Repository becomes a multi-lot store. Frontend adds lot selector.',
      difficulty: 'Hard'
    }
  ]
};

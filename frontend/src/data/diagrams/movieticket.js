// classDiagrams — movieticket
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Movie Ticket Booking System (BookMyShow) — Class Diagram',
  classes: [
    {
      name: 'MovieTicketService',
      stereotype: 'singleton',
      fields: [
        '- repository: MovieTicketRepository',
        '- seatLockManager: SeatLockManager',
        '- paymentProcessor: PaymentProcessor',
        '- seatMapNotifier: SeatMapNotifier',
        '- pricingStrategy: PricingStrategy'
      ],
      methods: [
        '+ getMovies(): List<Movie>',
        '+ getShows(movieId): List<Show>',
        '+ getSeats(showId): List<Seat>',
        '+ holdSeats(showId, seatIds, userId): Map',
        '+ bookSeats(showId, seatIds, userId, method, key): Booking',
        '+ cancelBooking(bookingId): Booking',
      ]
    },
    {
      name: 'SeatLockManager',
      fields: [
        '- seatLocks: ConcurrentHashMap<String, ReentrantLock>'
      ],
      methods: [
        '+ holdSeats(showId, seatIds, userId, duration, repo, notifier)',
        '+ confirmSeats(showId, seatIds, userId, repo, notifier)',
        '+ releaseSeats(...)',
        '+ expireStaleHolds(...)'
      ]
    },
    {
      name: 'MovieTicketRepository',
      fields: [
        '- movies: ConcurrentHashMap',
        '- theaters: ConcurrentHashMap',
        '- shows: ConcurrentHashMap',
        '- showSeats: Map<Long, Map<Long, Seat>>',
        '- bookings: ConcurrentHashMap'
      ],
      methods: [
        '+ getSeatsByShow(showId): List<Seat>',
        '+ findSeatById(showId, seatId): Seat',
        '+ updateSeat(seat): void',
        '+ saveBooking(booking): Booking'
      ]
    },
    {
      name: 'Seat',
      fields: [
        '- id: long',
        '- showId: long',
        '- row: int',
        '- col: int',
        '- seatType: SeatType',
        '- price: double',
        '- status: SeatStatus',
        '- heldByUserId: String',
        '- holdExpiresAt: long',
        '- version: long'
      ],
      methods: []
    },
    {
      name: 'SeatStatus',
      stereotype: 'enum',
      fields: [
        'AVAILABLE',
        'HELD',
        'BOOKED'
      ],
      methods: []
    },
    {
      name: 'SeatType',
      stereotype: 'enum',
      fields: [
        'SILVER',
        'GOLD',
        'PLATINUM'
      ],
      methods: []
    },
    {
      name: 'Booking',
      fields: [
        '- id: long',
        '- showId: long',
        '- seatIds: List<Long>',
        '- userId: String',
        '- bookingStatus: BookingStatus',
        '- paymentMethod: PaymentMethod',
        '- totalAmount: double',
        '- bookingTime: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'BookingStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'CONFIRMED',
        'CANCELLED'
      ],
      methods: []
    },
    {
      name: 'PricingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculatePrice(show, seat): double'
      ]
    },
    {
      name: 'BasePricingStrategy',
      fields: [
        'implements PricingStrategy'
      ],
      methods: [
        '+ calculatePrice(show, seat): double'
      ]
    },
    {
      name: 'SurgePricingStrategy',
      fields: [
        'implements PricingStrategy'
      ],
      methods: [
        '+ calculatePrice(show, seat): double'
      ]
    },
    {
      name: 'SeatFactory',
      fields: [],
      methods: [
        '+ createSeat(seatId, showId, row, col, seatType): Seat'
      ]
    },
    {
      name: 'SeatMapNotifier',
      fields: [
        '- observers: List<SeatAvailabilityObserver>'
      ],
      methods: [
        '+ notifyStatusChange(...)'
      ]
    },
    {
      name: 'SeatAvailabilityObserver',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onSeatStatusChanged(...)'
      ]
    },
    {
      name: 'PaymentProcessor',
      fields: [
        '- shouldFail: boolean'
      ],
      methods: [
        '+ processPayment(userId, amount, method): String'
      ]
    }
  ],
  relationships: [
    {
      from: 'MovieTicketService',
      to: 'SeatLockManager',
      label: 'uses'
    },
    {
      from: 'MovieTicketService',
      to: 'MovieTicketRepository',
      label: 'uses'
    },
    {
      from: 'MovieTicketService',
      to: 'PaymentProcessor',
      label: 'uses'
    },
    {
      from: 'MovieTicketService',
      to: 'PricingStrategy',
      label: 'uses'
    },
    {
      from: 'MovieTicketService',
      to: 'SeatMapNotifier',
      label: 'notifies'
    },
    {
      from: 'BasePricingStrategy',
      to: 'PricingStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SurgePricingStrategy',
      to: 'PricingStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SeatLockManager',
      to: 'Seat',
      label: 'locks & mutates'
    },
    {
      from: 'MovieTicketRepository',
      to: 'Seat',
      label: 'contains per show'
    },
    {
      from: 'MovieTicketRepository',
      to: 'Booking',
      label: 'stores'
    },
    {
      from: 'Seat',
      to: 'SeatStatus',
      label: 'has status'
    },
    {
      from: 'Seat',
      to: 'SeatType',
      label: 'has type'
    },
    {
      from: 'Booking',
      to: 'BookingStatus',
      label: 'has status'
    }
  ]
};

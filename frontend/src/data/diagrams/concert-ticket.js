// classDiagrams — concertTicket
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-31, RCA-044) — the previous version invented behavior
// directly on the data models (Event.bookSeats(), Seat.book()/release(), Booking.confirm()/
// cancel()/calculateTotal(), User.bookEvent()/cancelBooking()/getBookingHistory()) and omitted
// every real service/repository/strategy class entirely. The real models (Event, Venue, Section,
// Seat, Booking, User) are plain Lombok @Data POJOs with no business methods at all — every rule
// lives in ConcertTicketService, the per-seat-lock SeatLockManager, PaymentProcessor, and the
// CancellationPolicy family resolved by CancellationPolicyFactory.

export default {
  title: 'Concert Ticket Booking — Class Diagram',
  classes: [
    {
      name: 'ConcertTicketService',
      fields: [
        '- repository: ConcertTicketRepository',
        '- seatLockManager: SeatLockManager',
        '- paymentProcessor: PaymentProcessor',
        '- cancellationPolicyFactory: CancellationPolicyFactory',
        '- idempotencyCache: Map<String, Booking>'
      ],
      methods: [
        '+ selectSeats(eventId, seatIds, userId): Booking',
        '+ confirmBooking(bookingId, paymentMethod, idempotencyKey): Booking',
        '+ cancelBooking(bookingId): Booking',
        '+ releaseExpiredHolds(): void'
      ]
    },
    {
      name: 'SeatLockManager',
      fields: [
        '- seatLocks: Map<String, ReentrantLock>'
      ],
      methods: [
        '+ holdSeats(eventId, seatIds, userId, holdDurationMs, repository): void',
        '+ confirmSeats(eventId, seatIds, userId, repository): void',
        '+ releaseSeats(eventId, seatIds, repository): void',
        '+ expireStaleHolds(eventId, repository): void',
        '- lockSeatsInOrder(eventId, seatIds): List<ReentrantLock>'
      ]
    },
    {
      name: 'PaymentProcessor',
      fields: [
        '- shouldFail: boolean'
      ],
      methods: [
        '+ processPayment(userId, amount, paymentMethod): String',
        '+ setShouldFail(fail): void'
      ]
    },
    {
      name: 'ConcertTicketRepository',
      fields: [
        '- venues: Map<Long, Venue>',
        '- events: Map<Long, Event>',
        '- eventSeats: Map<Long, Map<String, Seat>>',
        '- bookings: Map<Long, Booking>',
        '- users: Map<String, User>'
      ],
      methods: [
        '+ saveEvent(event): Event',
        '+ findEventById(id): Event',
        '+ getSeatsByEvent(eventId): List<Seat>',
        '+ findSeatById(eventId, seatId): Seat',
        '+ updateSeat(seat): void',
        '+ saveBooking(booking): Booking',
        '+ findBookingById(id): Booking',
        '+ getBookingsByUser(userId): List<Booking>'
      ]
    },
    {
      name: 'CancellationPolicy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateRefund(booking, eventDateTime, cancelTime): double',
        '+ getPolicyName(): String'
      ]
    },
    {
      name: 'FullRefundPolicy',
      fields: [
        'implements CancellationPolicy',
        '// >= 7 days before the event: full refund'
      ],
      methods: [
        '+ calculateRefund(booking, eventDateTime, cancelTime): double'
      ]
    },
    {
      name: 'PartialRefundPolicy',
      fields: [
        'implements CancellationPolicy',
        '// 2-6 days before the event: 50% refund'
      ],
      methods: [
        '+ calculateRefund(booking, eventDateTime, cancelTime): double'
      ]
    },
    {
      name: 'NoRefundPolicy',
      fields: [
        'implements CancellationPolicy',
        '// < 2 days before the event, or after it started: no refund'
      ],
      methods: [
        '+ calculateRefund(booking, eventDateTime, cancelTime): double'
      ]
    },
    {
      name: 'CancellationPolicyFactory',
      fields: [
        '- fullRefundPolicy: FullRefundPolicy',
        '- partialRefundPolicy: PartialRefundPolicy',
        '- noRefundPolicy: NoRefundPolicy'
      ],
      methods: [
        '+ resolve(eventDateTime, cancelTime): CancellationPolicy'
      ]
    },
    {
      name: 'Venue',
      fields: [
        '- id: long',
        '- name: String',
        '- location: String',
        '- capacity: int',
        '- sections: List<Section>'
      ],
      methods: []
    },
    {
      name: 'Section',
      fields: [
        '- seatType: SeatType',
        '- rows: int',
        '- seatsPerRow: int',
        '- price: double'
      ],
      methods: [
        '+ totalSeats(): int'
      ]
    },
    {
      name: 'Event',
      fields: [
        '- id: long',
        '- artist: String',
        '- title: String',
        '- venueId: long',
        '- venueName: String',
        '- venueLocation: String',
        '- dateTime: LocalDateTime',
        '- status: EventStatus'
      ],
      methods: []
    },
    {
      name: 'EventStatus',
      stereotype: 'enum',
      fields: [
        'SCHEDULED',
        'SOLD_OUT',
        'CANCELLED',
        'COMPLETED'
      ],
      methods: []
    },
    {
      name: 'Seat',
      fields: [
        '- id: String',
        '- eventId: long',
        '- seatType: SeatType',
        '- row: String',
        '- number: int',
        '- price: double',
        '- status: SeatStatus',
        '- heldByUserId: String',
        '- holdExpiresAt: long',
        '- version: long'
      ],
      methods: []
    },
    {
      name: 'SeatType',
      stereotype: 'enum',
      fields: [
        'VIP',
        'GOLD',
        'SILVER',
        'GENERAL'
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
      name: 'Booking',
      fields: [
        '- id: long',
        '- userId: String',
        '- eventId: long',
        '- seatIds: List<String>',
        '- totalAmount: double',
        '- status: BookingStatus',
        '- holdExpiresAt: long',
        '- paymentMethod: PaymentMethod',
        '- paymentRef: String',
        '- refundAmount: double',
        '- bookingTime: LocalDateTime',
        '- cancelledAt: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'BookingStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'CONFIRMED',
        'CANCELLED',
        'REFUNDED'
      ],
      methods: []
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      fields: [
        'UPI',
        'CARD',
        'NET_BANKING',
        'WALLET'
      ],
      methods: []
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'ConcertTicketService', to: 'ConcertTicketRepository', label: 'uses' },
    { from: 'ConcertTicketService', to: 'SeatLockManager', label: 'holds/confirms/releases seats via' },
    { from: 'ConcertTicketService', to: 'PaymentProcessor', label: 'charges via' },
    { from: 'ConcertTicketService', to: 'CancellationPolicyFactory', label: 'refunds via' },
    { from: 'SeatLockManager', to: 'Seat', label: 'locks per-seat & mutates' },
    { from: 'CancellationPolicyFactory', to: 'CancellationPolicy', label: 'resolves to' },
    { from: 'FullRefundPolicy', to: 'CancellationPolicy', label: 'implements', dashed: true },
    { from: 'PartialRefundPolicy', to: 'CancellationPolicy', label: 'implements', dashed: true },
    { from: 'NoRefundPolicy', to: 'CancellationPolicy', label: 'implements', dashed: true },
    { from: 'ConcertTicketRepository', to: 'Venue', label: 'stores' },
    { from: 'ConcertTicketRepository', to: 'Event', label: 'stores' },
    { from: 'ConcertTicketRepository', to: 'Seat', label: 'stores' },
    { from: 'ConcertTicketRepository', to: 'Booking', label: 'stores' },
    { from: 'ConcertTicketRepository', to: 'User', label: 'stores' },
    { from: 'Venue', to: 'Section', label: 'has' },
    { from: 'Section', to: 'SeatType', label: 'has type' },
    { from: 'Event', to: 'EventStatus', label: 'has status' },
    { from: 'Seat', to: 'SeatType', label: 'has type' },
    { from: 'Seat', to: 'SeatStatus', label: 'has status' },
    { from: 'Booking', to: 'BookingStatus', label: 'has status' },
    { from: 'Booking', to: 'PaymentMethod', label: 'paid via' },
    { from: 'Booking', to: 'Event', label: 'references' },
    { from: 'Booking', to: 'Seat', label: 'references (by id)' }
  ]
};

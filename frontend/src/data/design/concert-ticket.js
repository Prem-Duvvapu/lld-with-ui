// designDetails — concertTicket
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-31, RCA-044) — the previous version called the real
// ConcertTicketService "BookingService" throughout (a name that appears nowhere in the source),
// gave it direct eventRepo/bookingRepo/seatLock/paymentGateway fields instead of the real
// repository/seatLockManager/paymentProcessor/cancellationPolicyFactory, invented a fabricated
// ETicket return type, and put business methods (hold()/book()/release(), confirm()/cancel())
// directly on the Event/Seat/Booking models — which are plain Lombok @Data POJOs with no
// behavior at all. Every rule actually lives in ConcertTicketService, the per-seat-lock
// SeatLockManager, PaymentProcessor and the CancellationPolicy family.

export default {
  title: 'Concert Ticket Booking — Design Details',
  requirements: [
    'Event management — create concerts with artist, venue, date, time, and description',
    'Venue seating — venues have sections (VIP, Gold, Silver, General) each with a row/seat layout and its own price',
    'Seat selection — users view seat availability and select specific seats for booking',
    'Booking workflow: PENDING → CONFIRMED → CANCELLED/REFUNDED — seats are held for 10 minutes during PENDING and released if payment fails or the hold expires',
    'Concurrent booking prevention — two users cannot book the same seat simultaneously (per-seat locking, acquired in ascending seat-id order for a multi-seat request)',
    'Payment integration — process payment through PaymentProcessor, confirm booking on success, release the held seats on failure',
    'Booking history — users can view past and upcoming bookings',
    'Cancellation and refund — users can cancel bookings before the event with a refund tier resolved purely from days-until-event'
  ],
  entities: [
    {
      name: 'ConcertTicketService',
      description: 'Facade the controller delegates to wholesale. Owns venue/event/seat lookups directly; every booking-lifecycle mutation is delegated to SeatLockManager (seat holds), PaymentProcessor (charging) and CancellationPolicyFactory (refunds).',
      fields: [
        {
          name: 'repository',
          type: 'ConcertTicketRepository',
          description: 'Venue/event/seat/booking/user storage'
        },
        {
          name: 'seatLockManager',
          type: 'SeatLockManager',
          description: 'Owns per-seat locking for hold/confirm/release — the service never mutates a Seat directly'
        },
        {
          name: 'paymentProcessor',
          type: 'PaymentProcessor',
          description: 'Mock payment gateway; always succeeds unless a test flips setShouldFail(true)'
        },
        {
          name: 'cancellationPolicyFactory',
          type: 'CancellationPolicyFactory',
          description: 'Resolves the refund tier at cancellation time from days-until-event'
        },
        {
          name: 'idempotencyCache',
          type: 'Map<String, Booking>',
          description: 'A retried confirmBooking() call with the same idempotency key returns the already-confirmed booking instead of double-charging'
        }
      ],
      methods: [
        {
          name: 'selectSeats(eventId, seatIds, userId)',
          returns: 'Booking',
          description: 'Holds the requested seats via SeatLockManager (all-or-nothing across the batch), sums their price, and creates a PENDING booking with a 10-minute holdExpiresAt'
        },
        {
          name: 'confirmBooking(bookingId, paymentMethod, idempotencyKey)',
          returns: 'Booking',
          description: 'Rejects an expired or already-non-PENDING booking, transitions the held seats to BOOKED, charges via PaymentProcessor, and marks the booking CONFIRMED — releasing the seats and cancelling the booking if payment fails'
        },
        {
          name: 'cancelBooking(bookingId)',
          returns: 'Booking',
          description: 'A PENDING booking cancels for free. A CONFIRMED booking\'s refund is resolved by CancellationPolicyFactory from days remaining before the event; either way the held/booked seats are released back to AVAILABLE'
        },
        {
          name: 'releaseExpiredHolds()',
          returns: 'void',
          description: 'Runs on a fixed 30s schedule: sweeps every event\'s stale HELD seats back to AVAILABLE and cancels any PENDING booking whose hold has expired'
        }
      ]
    },
    {
      name: 'SeatLockManager',
      description: 'Owns a ReentrantLock per "eventId:seatId", acquired in ascending seat-id order for a multi-seat request so two overlapping bookings can never deadlock on each other\'s locks. Availability is re-read from the repository inside the lock, never trusted from a value read before locking — the same idiom as DriverAssignmentService/DeliveryAssignmentService\'s check-then-act fix.',
      fields: [
        {
          name: 'seatLocks',
          type: 'Map<String, ReentrantLock>',
          description: 'One fair lock per "eventId:seatId", created lazily via computeIfAbsent'
        }
      ],
      methods: [
        {
          name: 'holdSeats(eventId, seatIds, userId, holdDurationMs, repository)',
          returns: 'void',
          description: 'Validates every seat in the batch is AVAILABLE (or a stale HELD past its own expiry) before writing any of them — a partial multi-seat hold can never happen'
        },
        {
          name: 'confirmSeats(eventId, seatIds, userId, repository)',
          returns: 'void',
          description: 'Transitions a held-by-this-user, non-expired batch of seats to BOOKED'
        },
        {
          name: 'releaseSeats(eventId, seatIds, repository)',
          returns: 'void',
          description: 'Returns seats to AVAILABLE, clearing heldByUserId/holdExpiresAt'
        },
        {
          name: 'expireStaleHolds(eventId, repository)',
          returns: 'void',
          description: 'Belt-and-braces sweep so listings reflect an expired hold without a customer having to attempt one first'
        }
      ]
    },
    {
      name: 'CancellationPolicy',
      description: 'Strategy interface for refund calculation, resolved by CancellationPolicyFactory purely from how many days remain before the event at cancellation time: FullRefundPolicy (>= 7 days), PartialRefundPolicy (2-6 days, 50%), NoRefundPolicy (< 2 days, or after the event started).',
      fields: [],
      methods: [
        {
          name: 'calculateRefund(booking, eventDateTime, cancelTime)',
          returns: 'double',
          description: 'Refund amount for this policy tier'
        }
      ]
    },
    {
      name: 'Event / Venue / Section / Seat / Booking / User',
      description: 'Plain Lombok @Data models — no business methods. Venue has-a List<Section> (a pricing/layout template per seating tier, not booking state); a Seat is a per-event copy stamped out from its Section, so the same physical seat gets a fresh AVAILABLE row for every event scheduled at that venue. Booking exists from the moment seats are held (PENDING, with holdExpiresAt set) through CONFIRMED to CANCELLED/REFUNDED.',
      fields: [],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'State (via enum + service-enforced transitions)',
      used: true,
      explanation: 'SeatStatus (AVAILABLE → HELD → BOOKED, with HELD able to fall back to AVAILABLE) and BookingStatus (PENDING → CONFIRMED → CANCELLED/REFUNDED) are both state machines. Neither model enforces its own transitions — SeatLockManager and ConcertTicketService are the only code that mutates status, always under the seat\'s lock.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'ConcertTicketService, SeatLockManager, PaymentProcessor and CancellationPolicyFactory are Spring-managed singleton beans, giving every request the same seat-lock map and booking rules.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'CancellationPolicy interface with FullRefundPolicy/PartialRefundPolicy/NoRefundPolicy. ConcertTicketService delegates refund calculation to whichever policy CancellationPolicyFactory.resolve() returns — never an if/else ladder at the call site.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'A read-through cache in front of ConcertTicketRepository could serve seat-availability queries without touching SeatLockManager\'s locks. Would reduce lock contention on hot seats, at the cost of a staleness window.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'When a seat becomes AVAILABLE again from a cancellation or expired hold, waitlisted users could be notified without ConcertTicketService knowing about notification delivery.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'ConcertTicketRepository owns storage. SeatLockManager owns per-seat locking and hold/confirm/release. PaymentProcessor owns charging. CancellationPolicyFactory/CancellationPolicy own refund math. ConcertTicketService only orchestrates the sequence.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New cancellation tiers implement CancellationPolicy and register with CancellationPolicyFactory. New seat statuses/booking statuses add an enum constant. Core booking flow in ConcertTicketService stays closed.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'ConcertTicketService depends on the CancellationPolicy abstraction (via the factory), not a concrete refund implementation. SeatLockManager depends on ConcertTicketRepository being passed in, not a hardcoded storage mechanism.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Seat hold/confirm/release logic is centralized in SeatLockManager — ConcertTicketService never touches Seat.status directly. Refund math is centralized in the CancellationPolicy family.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Booking model: hold seats, pay, confirm. A plain long holdExpiresAt timestamp is the entire TTL mechanism — no scheduler state beyond the periodic sweep.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Seat State Changes',
      description: 'Seat is a plain data holder; every status change is funneled through SeatLockManager under the seat\'s own lock. No other class writes Seat.status.',
      alternative: 'Could let ConcertTicketService mutate Seat.status directly. Routing every mutation through one lock-owning class is what makes the no-double-booking guarantee provable.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Venue has-a List<Section>. Booking has-a List<String> seatIds and references an Event/User by id. Nothing in this module uses class inheritance for the domain model.',
      alternative: 'Could create an Event subclass hierarchy per event type. Composition is chosen because every event shares the same booking/seat-hold workflow — only pricing/layout data (Section) varies.'
    },
    {
      name: 'Polymorphism — Cancellation Policies',
      description: 'ConcertTicketService calls calculateRefund() on the CancellationPolicy interface. FullRefundPolicy, PartialRefundPolicy and NoRefundPolicy each implement it differently.',
      alternative: 'Could use if-else based on days-until-event inline in the service. Strategy encapsulates each policy cleanly and keeps CancellationPolicyFactory as the one place new tiers get added.'
    }
  ],
  extensibility: [
    {
      area: 'New Event Type',
      description: 'Event already carries only generic fields (artist, title, venue, dateTime, status) — a sports or theater event needs no new class, just different seed data through the same booking/seat-hold workflow.',
      difficulty: 'Easy'
    },
    {
      area: 'Dynamic Pricing',
      description: 'Implement a DynamicPricingStrategy that adjusts Seat.price based on demand, resolved alongside (not instead of) Section\'s static per-tier price. Pluggable the same way CancellationPolicy is.',
      difficulty: 'Medium'
    },
    {
      area: 'Waitlist for Sold-Out Events',
      description: 'Users join a waitlist keyed by event/section. When releaseSeats() or expireStaleHolds() frees a seat, the first waitlisted user gets a time-limited offer instead of the seat going straight back to AVAILABLE for anyone.',
      difficulty: 'Medium'
    },
    {
      area: 'Resale / Ticket Transfer',
      description: 'Allow a user to list a CONFIRMED booking\'s seats for resale. Needs a new ResaleService with commission handling — the existing SeatLockManager/CancellationPolicy machinery is reused for the actual seat/refund mechanics.',
      difficulty: 'Hard'
    }
  ]
};

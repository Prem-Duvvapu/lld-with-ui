// designDetails — concertTicket
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Concert Ticket Booking — Design Details',
  requirements: [
    'Event management — create concerts with artist, venue, date, time, and description',
    'Venue seating — venues have sections (VIP, Premium, General) each with numbered seats and different pricing',
    'Seat selection — users view seat map and select specific seats for booking',
    'Booking workflow: PENDING to CONFIRMED to CANCELLED — seats are temporarily held during PENDING and released if payment fails',
    'Concurrent booking prevention — two users cannot book the same seat simultaneously (locking mechanism)',
    'Payment integration — process payment through configured gateway, confirm booking on payment success, release on failure',
    'Booking history — users can view past and upcoming bookings with e-ticket generation',
    'Cancellation and refund — users can cancel bookings before event date with configurable cancellation policy and refund amount'
  ],
  entities: [
    {
      name: 'BookingService',
      description: 'Core orchestration service managing seat selection, temporary holds, payment processing, and booking confirmation.',
      fields: [
        {
          name: 'eventRepo',
          type: 'Repository<Event>',
          description: 'Data store for all concert events'
        },
        {
          name: 'bookingRepo',
          type: 'Repository<Booking>',
          description: 'Data store for all bookings'
        },
        {
          name: 'seatLock',
          type: 'ReentrantLock',
          description: 'Ensures atomic seat booking operations'
        },
        {
          name: 'paymentGateway',
          type: 'PaymentGateway',
          description: 'External payment processor'
        }
      ],
      methods: [
        {
          name: 'selectSeats(eventId, seatIds, user)',
          returns: 'Booking',
          description: 'Creates a PENDING booking, temporarily holds seats with a 10-minute timer'
        },
        {
          name: 'confirmBooking(bookingId, paymentDetails)',
          returns: 'Booking',
          description: 'Processes payment and confirms booking, or releases seats on failure'
        },
        {
          name: 'cancelBooking(bookingId)',
          returns: 'Booking',
          description: 'Cancels booking, releases seats, processes refund if applicable'
        },
        {
          name: 'releaseExpiredHolds()',
          returns: 'void',
          description: 'Releases seats for PENDING bookings that exceeded hold duration'
        }
      ]
    },
    {
      name: 'Event',
      description: 'Concert event with artist information, schedule, venue assignment, and ticket pricing configuration.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique event identifier'
        },
        {
          name: 'artist',
          type: 'String',
          description: 'Performer or band name'
        },
        {
          name: 'venue',
          type: 'Venue',
          description: 'Concert venue with seating layout'
        },
        {
          name: 'dateTime',
          type: 'LocalDateTime',
          description: 'Concert start time'
        },
        {
          name: 'status',
          type: 'EventStatus',
          description: 'SCHEDULED, SOLD_OUT, CANCELLED, COMPLETED'
        },
        {
          name: 'cancellationPolicy',
          type: 'CancellationPolicy',
          description: 'Refund rules and deadlines'
        }
      ],
      methods: [
        {
          name: 'getAvailableSeats()',
          returns: 'List<Seat>',
          description: 'Returns seats not booked or held'
        },
        {
          name: 'holdSeats(seatIds)',
          returns: 'boolean',
          description: 'Temporarily marks seats as held'
        },
        {
          name: 'releaseSeats(seatIds)',
          returns: 'void',
          description: 'Releases held or booked seats back to available'
        }
      ]
    },
    {
      name: 'Venue',
      description: 'Physical venue with multiple seating sections (VIP, Premium, General), each with row/seat layout and pricing.',
      fields: [
        {
          name: 'name',
          type: 'String',
          description: 'Venue name (e.g., Madison Square Garden)'
        },
        {
          name: 'sections',
          type: 'List<Section>',
          description: 'Seating sections with capacity and pricing'
        },
        {
          name: 'seatMap',
          type: 'Map<String, Seat>',
          description: 'All seats indexed by seat ID for O(1) lookup'
        }
      ],
      methods: [
        {
          name: 'getSection(name)',
          returns: 'Section',
          description: 'Returns a specific seating section'
        },
        {
          name: 'getSeat(seatId)',
          returns: 'Seat',
          description: 'Returns a specific seat by ID'
        }
      ]
    },
    {
      name: 'Seat',
      description: 'Individual seat with unique identifier, section, row, number, status, and price.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique seat identifier (e.g., VIP-A-12)'
        },
        {
          name: 'section',
          type: 'Section',
          description: 'Seating section this seat belongs to'
        },
        {
          name: 'row',
          type: 'String',
          description: 'Row letter/number'
        },
        {
          name: 'number',
          type: 'int',
          description: 'Seat number within the row'
        },
        {
          name: 'price',
          type: 'double',
          description: 'Ticket price for this seat'
        },
        {
          name: 'status',
          type: 'SeatStatus',
          description: 'AVAILABLE, HELD, BOOKED'
        }
      ],
      methods: [
        {
          name: 'hold()',
          returns: 'boolean',
          description: 'Changes status to HELD if currently AVAILABLE'
        },
        {
          name: 'book()',
          returns: 'boolean',
          description: 'Changes status to BOOKED if currently HELD'
        },
        {
          name: 'release()',
          returns: 'void',
          description: 'Changes status back to AVAILABLE'
        }
      ]
    },
    {
      name: 'Booking',
      description: 'Ticket booking for a set of seats. Tracks payment, holds, status, and generates e-tickets.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique booking identifier'
        },
        {
          name: 'user',
          type: 'User',
          description: 'User who made the booking'
        },
        {
          name: 'event',
          type: 'Event',
          description: 'Concert event'
        },
        {
          name: 'seats',
          type: 'List<Seat>',
          description: 'Booked seats'
        },
        {
          name: 'totalAmount',
          type: 'double',
          description: 'Sum of seat prices'
        },
        {
          name: 'status',
          type: 'BookingStatus',
          description: 'PENDING, CONFIRMED, CANCELLED'
        },
        {
          name: 'holdExpiry',
          type: 'LocalDateTime',
          description: 'When the seat hold expires (10 min from selection)'
        },
        {
          name: 'paymentRef',
          type: 'String',
          description: 'Payment transaction reference'
        }
      ],
      methods: [
        {
          name: 'confirm()',
          returns: 'void',
          description: 'Confirms booking — seats become BOOKED'
        },
        {
          name: 'cancel()',
          returns: 'void',
          description: 'Cancels booking — seats released, refund processed'
        },
        {
          name: 'isHoldExpired()',
          returns: 'boolean',
          description: 'Checks if the seat hold timer has expired'
        },
        {
          name: 'generateETicket()',
          returns: 'ETicket',
          description: 'Generates downloadable e-ticket with QR code'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'SeatStatus (AVAILABLE to HELD to BOOKED) and BookingStatus (PENDING to CONFIRMED/CANCELLED) are both state machines. Valid transitions enforced.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'BookingService is a singleton ensuring single source of truth for seat availability. Critical for preventing double-booking.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'CancellationPolicy interface with NoRefundPolicy, FullRefundPolicy, PartialRefundPolicy. BookingService delegates refund calculation to the policy.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'A SeatAvailabilityProxy could cache seat status and serve read queries without hitting the main lock. Reduces lock contention on hot seats.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'When VIP seats become available from cancellation, waitlisted users could be notified without BookingService knowing about notification.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Event manages concert details. Venue manages seating. Seat tracks individual state. Booking manages transaction lifecycle. BookingService orchestrates.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New cancellation policies implement CancellationPolicy. New seat statuses add to enum. New payment gateways implement PaymentGateway. Core booking flow stays closed.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'BookingService depends on PaymentGateway and CancellationPolicy abstractions. Event depends on Venue. Seat depends on Section.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Seat hold/release is centralized in Event. Booking status validation is in Booking. Payment delegated to PaymentGateway. Cancellation in CancellationPolicy.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Booking model: hold seats, pay, confirm. 10-minute hold timer is simple TTL check. Single ReentrantLock prevents double-booking.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Seat State Changes',
      description: 'Seat encapsulates status with controlled methods (hold(), book(), release()). External code cannot set status directly.',
      alternative: 'Could expose setStatus(). Encapsulated transitions enforce booking invariants at model level.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Venue has-a List of Section. Section has-a List of Seat. Event has-a Venue. Booking has-a User, Event, and List of Seat.',
      alternative: 'Could create event type hierarchy. Composition is chosen because differences are in pricing and layout.'
    },
    {
      name: 'Polymorphism — Cancellation Policies',
      description: 'BookingService calls calculateRefund() on CancellationPolicy interface. NoRefund, FullRefund, PartialRefund each implement differently.',
      alternative: 'Could use if-else based on days-until-event. Strategy encapsulates each policy cleanly.'
    }
  ],
  extensibility: [
    {
      area: 'New Event Type',
      description: 'Add SportsEvent, TheaterEvent extending Event with type-specific fields. Booking, seat selection, payment workflows reused without change.',
      difficulty: 'Easy'
    },
    {
      area: 'Dynamic Pricing',
      description: 'Implement DynamicPricingStrategy adjusting seat prices based on demand. Pluggable via strategy pattern.',
      difficulty: 'Medium'
    },
    {
      area: 'Waitlist for Sold-Out Events',
      description: 'Users join waitlist. When cancellation occurs, first waitlisted user gets time-limited offer. Extends cancellation flow.',
      difficulty: 'Medium'
    },
    {
      area: 'Resale / Ticket Transfer',
      description: 'Allow users to list booked tickets for resale. ResaleTicket extends Booking. Requires new ResaleService with commission.',
      difficulty: 'Hard'
    }
  ]
};

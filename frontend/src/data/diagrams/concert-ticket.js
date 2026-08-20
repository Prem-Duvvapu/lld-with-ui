// classDiagrams — concertTicket
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Concert Ticket Booking — Class Diagram',
  classes: [
    {
      name: 'Event',
      fields: [
        '- id: String',
        '- name: String',
        '- artist: String',
        '- date: LocalDateTime',
        '- venue: Venue',
        '- seats: Map<SeatType, List<Seat>>'
      ],
      methods: [
        '+ getAvailableSeats(type): List<Seat>',
        '+ bookSeats(user, seats): Booking',
        '+ cancelSeats(booking): void'
      ]
    },
    {
      name: 'Venue',
      fields: [
        '- id: String',
        '- name: String',
        '- location: String',
        '- capacity: int',
        '- seatLayout: Map<SeatType, Integer>'
      ],
      methods: [
        '+ getSeatMap(): Map'
      ]
    },
    {
      name: 'Seat',
      fields: [
        '- id: String',
        '- row: String',
        '- number: int',
        '- type: SeatType',
        '- price: double',
        '- isBooked: boolean'
      ],
      methods: [
        '+ book(): void',
        '+ release(): void'
      ]
    },
    {
      name: 'Booking',
      fields: [
        '- id: String',
        '- user: User',
        '- event: Event',
        '- seats: List<Seat>',
        '- totalAmount: double',
        '- status: BookingStatus',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ confirm(): void',
        '+ cancel(): void',
        '+ calculateTotal(): double'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- bookings: List<Booking>'
      ],
      methods: [
        '+ bookEvent(event, seats): Booking',
        '+ cancelBooking(id): void',
        '+ getBookingHistory(): List<Booking>'
      ]
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
      name: 'SeatType',
      stereotype: 'enum',
      fields: [
        'VIP',
        'GOLD',
        'SILVER',
        'GENERAL'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Event',
      to: 'Venue',
      label: 'hosted at'
    },
    {
      from: 'Event',
      to: 'Seat',
      label: 'has'
    },
    {
      from: 'Seat',
      to: 'SeatType',
      label: 'has type'
    },
    {
      from: 'Booking',
      to: 'Event',
      label: 'references'
    },
    {
      from: 'Booking',
      to: 'User',
      label: 'belongs to'
    },
    {
      from: 'Booking',
      to: 'Seat',
      label: 'contains'
    },
    {
      from: 'Booking',
      to: 'BookingStatus',
      label: 'has state'
    }
  ]
};

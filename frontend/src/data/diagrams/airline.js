// classDiagrams — airline
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Airline Reservation — Class Diagram',
  classes: [
    {
      name: 'AirlineService',
      fields: [
        '- repository: AirlineRepository',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ searchFlights(src, dest, date): List<Flight>',
        '+ getSeats(flightId): List<Seat>',
        '+ bookFlight(flightId, seats, user, pax): Booking',
        '+ checkIn(bookingId): Booking',
        '+ cancelBooking(bookingId): Booking'
      ]
    },
    {
      name: 'Flight',
      fields: [
        '- id: String',
        '- flightNumber: String',
        '- source: String',
        '- destination: String',
        '- departureTime: LocalDateTime',
        '- totalSeats: int',
        '- availableSeats: int',
        '- fare: double'
      ],
      methods: []
    },
    {
      name: 'Seat',
      fields: [
        '- id: String',
        '- row: String',
        '- col: String',
        '- classType: SeatClass',
        '- price: double',
        '- status: SeatStatus'
      ],
      methods: [
        '+ setStatus(s): void'
      ]
    },
    {
      name: 'Booking',
      fields: [
        '- id: String',
        '- flightId: String',
        '- seatIds: List<String>',
        '- passengerName: String',
        '- status: BookingStatus',
        '- totalAmount: double'
      ],
      methods: []
    },
    {
      name: 'SeatClass',
      stereotype: 'enum',
      fields: [
        'ECONOMY',
        'BUSINESS',
        'FIRST'
      ],
      methods: []
    },
    {
      name: 'SeatStatus',
      stereotype: 'enum',
      fields: [
        'AVAILABLE',
        'BOOKED'
      ],
      methods: []
    },
    {
      name: 'BookingStatus',
      stereotype: 'enum',
      fields: [
        'CONFIRMED',
        'CHECKED_IN',
        'CANCELLED'
      ],
      methods: []
    },
    {
      name: 'AirlineRepository',
      fields: [
        '- flights: Map<String, Flight>',
        '- seats: ConcurrentHashMap',
        '- bookings: ConcurrentHashMap',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ getAvailableSeats(flightId): List<Seat>',
        '+ saveBooking(b): void',
        '+ getActiveBookings(): List<Booking>'
      ]
    }
  ],
  relationships: [
    {
      from: 'AirlineService',
      to: 'AirlineRepository',
      label: 'uses'
    },
    {
      from: 'AirlineService',
      to: 'Booking',
      label: 'manages'
    },
    {
      from: 'AirlineRepository',
      to: 'Flight',
      label: 'contains'
    },
    {
      from: 'AirlineRepository',
      to: 'Seat',
      label: 'contains'
    },
    {
      from: 'Flight',
      to: 'Seat',
      label: 'has many'
    },
    {
      from: 'Booking',
      to: 'Seat',
      label: 'references'
    },
    {
      from: 'Booking',
      to: 'Flight',
      label: 'belongs to'
    },
    {
      from: 'Seat',
      to: 'SeatClass',
      label: 'has class'
    },
    {
      from: 'Seat',
      to: 'SeatStatus',
      label: 'has status'
    },
    {
      from: 'Booking',
      to: 'BookingStatus',
      label: 'has state'
    }
  ]
};

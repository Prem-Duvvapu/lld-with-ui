// classDiagrams — hotel
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Hotel Management — Class Diagram',
  classes: [
    {
      name: 'HotelService',
      fields: [
        '- repository: HotelRepository',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ getHotels(): List<Hotel>',
        '+ getAvailableRooms(hotelId, dates): List<Room>',
        '+ bookRoom(roomId, user, guest, dates): Booking',
        '+ checkIn(bookingId): Booking',
        '+ checkOut(bookingId): Booking',
        '+ cancelBooking(bookingId): Booking'
      ]
    },
    {
      name: 'Hotel',
      fields: [
        '- id: String',
        '- name: String',
        '- location: String',
        '- rating: double',
        '- amenities: List<String>'
      ],
      methods: []
    },
    {
      name: 'Room',
      fields: [
        '- id: String',
        '- roomNumber: String',
        '- type: RoomType (SINGLE/DOUBLE/SUITE/DELUXE)',
        '- price: double',
        '- status: RoomStatus'
      ],
      methods: [
        '+ setStatus(s): void'
      ]
    },
    {
      name: 'Booking',
      fields: [
        '- id: String',
        '- guestName: String',
        '- checkIn: LocalDate',
        '- checkOut: LocalDate',
        '- status: BookingStatus',
        '- totalAmount: double'
      ],
      methods: []
    },
    {
      name: 'RoomType',
      stereotype: 'enum',
      fields: [
        'SINGLE',
        'DOUBLE',
        'SUITE',
        'DELUXE'
      ],
      methods: []
    },
    {
      name: 'RoomStatus',
      stereotype: 'enum',
      fields: [
        'AVAILABLE',
        'BOOKED',
        'OCCUPIED',
        'MAINTENANCE'
      ],
      methods: []
    },
    {
      name: 'BookingStatus',
      stereotype: 'enum',
      fields: [
        'CONFIRMED',
        'CHECKED_IN',
        'CHECKED_OUT',
        'CANCELLED'
      ],
      methods: []
    },
    {
      name: 'HotelRepository',
      fields: [
        '- hotels: Map<String, Hotel>',
        '- rooms: ConcurrentHashMap',
        '- bookings: ConcurrentHashMap',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ getAvailableRooms(hotelId): List<Room>',
        '+ saveBooking(b): void',
        '+ getActiveBookings(): List<Booking>'
      ]
    }
  ],
  relationships: [
    {
      from: 'HotelService',
      to: 'HotelRepository',
      label: 'uses'
    },
    {
      from: 'HotelService',
      to: 'Booking',
      label: 'manages'
    },
    {
      from: 'HotelRepository',
      to: 'Hotel',
      label: 'contains'
    },
    {
      from: 'HotelRepository',
      to: 'Room',
      label: 'contains'
    },
    {
      from: 'Booking',
      to: 'Room',
      label: 'references'
    },
    {
      from: 'Room',
      to: 'RoomType',
      label: 'has type'
    },
    {
      from: 'Room',
      to: 'RoomStatus',
      label: 'has status'
    },
    {
      from: 'Booking',
      to: 'BookingStatus',
      label: 'has state'
    }
  ]
};

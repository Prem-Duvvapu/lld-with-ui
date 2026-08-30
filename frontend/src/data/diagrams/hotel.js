// classDiagrams — hotel
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — the previous version predated a refactor: it showed a
// flat HotelService/HotelRepository with a 4-value BookingStatus enum (CONFIRMED/CHECKED_IN/
// CHECKED_OUT/CANCELLED) and a RoomStatus that treated "booked" as a room-wide flag, and omitted
// the real TariffStrategy and CancellationRefundStrategy layers entirely. The real module answers
// "is this room free" per date range from Booking.overlaps() against a per-room ReentrantLock
// (RoomStatus now only distinguishes AVAILABLE/MAINTENANCE), prices a stay via
// TariffStrategyFactory (flat rate vs. a Friday/Saturday-night surcharge), and resolves a
// cancellation's refund via CancellationRefundStrategyFactory purely from notice given.

export default {
  title: 'Hotel Management System — Class Diagram',
  classes: [
    {
      name: 'HotelService',
      fields: [
        '- repository: HotelRepository',
        '- bookingService: RoomBookingService'
      ],
      methods: [
        '+ getAllHotels(): List<Hotel>',
        '+ getRoomsByHotel(hotelId): List<Room>',
        '+ getAvailableRooms(hotelId, checkIn, checkOut): List<Room>',
        '+ bookRoom(roomId, userId, guestName, checkIn, checkOut): Booking',
        '+ checkIn(bookingId): Booking',
        '+ checkOut(bookingId): Booking',
        '+ cancelBooking(bookingId): Booking',
        '+ markNoShow(bookingId): Booking'
      ]
    },
    {
      name: 'RoomBookingService',
      fields: [
        '- repository: HotelRepository',
        '- tariffStrategyFactory: TariffStrategyFactory',
        '- refundStrategyFactory: CancellationRefundStrategyFactory',
        '- roomLocks: ConcurrentMap<String, ReentrantLock>'
      ],
      methods: [
        '+ book(roomId, userId, guestName, checkIn, checkOut): Booking',
        '+ checkIn(bookingId): Booking',
        '+ checkOut(bookingId): Booking',
        '+ cancel(bookingId, cancellationDate): Booking',
        '+ markNoShow(bookingId): Booking',
        '+ isAvailable(roomId, checkIn, checkOut): boolean'
      ]
    },
    {
      name: 'HotelRepository',
      fields: [
        '- hotels: Map<String, Hotel>',
        '- rooms: Map<String, Room>',
        '- bookings: Map<String, Booking>',
        '- bookingCounter: AtomicInteger'
      ],
      methods: [
        '+ getAllHotels(): List<Hotel>',
        '+ getRoomsByHotel(hotelId): List<Room>',
        '+ getRoom(id): Room',
        '+ saveBooking(booking): void',
        '+ findActiveBookingsForRoom(roomId): List<Booking>',
        '+ getActiveBookings(): List<Booking>'
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
        '- hotelId: String',
        '- roomNumber: String',
        '- type: RoomType',
        '- price: double',
        '- status: RoomStatus'
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
        'MAINTENANCE'
      ],
      methods: []
    },
    {
      name: 'Booking',
      fields: [
        '- id: String',
        '- hotelId: String',
        '- roomId: String',
        '- userId: String',
        '- guestName: String',
        '- checkIn: LocalDate',
        '- checkOut: LocalDate',
        '- status: ReservationStatus',
        '- totalAmount: double',
        '- tariffStrategyName: String',
        '- refundAmount: double',
        '- refundReason: String'
      ],
      methods: [
        '+ overlaps(otherCheckIn, otherCheckOut): boolean'
      ]
    },
    {
      name: 'ReservationStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'CONFIRMED',
        'CHECKED_IN',
        'CHECKED_OUT',
        'CANCELLED',
        'NO_SHOW'
      ],
      methods: []
    },
    {
      name: 'TariffStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getName(): String',
        '+ calculateTariff(room, checkIn, checkOut): double'
      ]
    },
    {
      name: 'StandardTariffStrategy',
      fields: [
        'implements TariffStrategy'
      ],
      methods: [
        '+ calculateTariff(room, checkIn, checkOut): double'
      ]
    },
    {
      name: 'WeekendTariffStrategy',
      fields: [
        'implements TariffStrategy',
        '+ WEEKEND_SURCHARGE_MULTIPLIER: double = 1.25'
      ],
      methods: [
        '+ calculateTariff(room, checkIn, checkOut): double'
      ]
    },
    {
      name: 'TariffStrategyFactory',
      fields: [
        '- standard: StandardTariffStrategy',
        '- weekend: WeekendTariffStrategy'
      ],
      methods: [
        '+ resolve(checkIn, checkOut): TariffStrategy'
      ]
    },
    {
      name: 'CancellationRefundStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getName(): String',
        '+ calculateRefund(booking, cancellationDate): RefundResult'
      ]
    },
    {
      name: 'FullRefundStrategy',
      fields: [
        'implements CancellationRefundStrategy'
      ],
      methods: [
        '+ calculateRefund(booking, cancellationDate): RefundResult'
      ]
    },
    {
      name: 'PartialRefundStrategy',
      fields: [
        'implements CancellationRefundStrategy',
        '+ REFUND_FRACTION: double = 0.5'
      ],
      methods: [
        '+ calculateRefund(booking, cancellationDate): RefundResult'
      ]
    },
    {
      name: 'NoRefundStrategy',
      fields: [
        'implements CancellationRefundStrategy'
      ],
      methods: [
        '+ calculateRefund(booking, cancellationDate): RefundResult'
      ]
    },
    {
      name: 'CancellationRefundStrategyFactory',
      fields: [
        '- full: FullRefundStrategy',
        '- partial: PartialRefundStrategy',
        '- none: NoRefundStrategy',
        '+ FULL_REFUND_THRESHOLD_DAYS: int = 3'
      ],
      methods: [
        '+ resolve(booking, cancellationDate): CancellationRefundStrategy'
      ]
    },
    {
      name: 'RefundResult',
      fields: [
        'amount: double',
        'reason: String'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'HotelService', to: 'HotelRepository', label: 'uses' },
    { from: 'HotelService', to: 'RoomBookingService', label: 'delegates lifecycle to' },
    { from: 'RoomBookingService', to: 'HotelRepository', label: 'uses' },
    { from: 'RoomBookingService', to: 'TariffStrategyFactory', label: 'prices via' },
    { from: 'RoomBookingService', to: 'CancellationRefundStrategyFactory', label: 'refunds via' },
    { from: 'RoomBookingService', to: 'Booking', label: 'locks per-room & mutates' },
    { from: 'HotelRepository', to: 'Hotel', label: 'stores' },
    { from: 'HotelRepository', to: 'Room', label: 'stores' },
    { from: 'HotelRepository', to: 'Booking', label: 'stores' },
    { from: 'Room', to: 'RoomType', label: 'has type' },
    { from: 'Room', to: 'RoomStatus', label: 'has status' },
    { from: 'Booking', to: 'ReservationStatus', label: 'has status' },
    { from: 'Booking', to: 'Room', label: 'references' },
    { from: 'TariffStrategyFactory', to: 'TariffStrategy', label: 'resolves to' },
    { from: 'StandardTariffStrategy', to: 'TariffStrategy', label: 'implements', dashed: true },
    { from: 'WeekendTariffStrategy', to: 'TariffStrategy', label: 'implements', dashed: true },
    { from: 'CancellationRefundStrategyFactory', to: 'CancellationRefundStrategy', label: 'resolves to' },
    { from: 'FullRefundStrategy', to: 'CancellationRefundStrategy', label: 'implements', dashed: true },
    { from: 'PartialRefundStrategy', to: 'CancellationRefundStrategy', label: 'implements', dashed: true },
    { from: 'NoRefundStrategy', to: 'CancellationRefundStrategy', label: 'implements', dashed: true },
    { from: 'CancellationRefundStrategy', to: 'RefundResult', label: 'returns' }
  ]
};

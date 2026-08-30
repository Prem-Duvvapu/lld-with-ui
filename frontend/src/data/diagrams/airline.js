// classDiagrams — airline
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Airline Reservation System — Class Diagram',
  classes: [
    {
      name: 'AirlineController',
      stereotype: 'controller',
      fields: ['- airlineService: AirlineService'],
      methods: [
        '+ searchFlights(source, destination, date): List<Flight>',
        '+ getFlightSeats(flightId): List<Seat>',
        '+ holdSeats(flightId, body): Map',
        '+ bookFlight(body): Booking',
        '+ cancelBooking(bookingId): Booking',
      ]
    },
    {
      name: 'AirlineService',
      stereotype: 'facade',
      fields: [
        '- repository: AirlineRepository',
        '- seatLockManager: SeatLockManager',
        '- paymentProcessor: PaymentProcessor',
        '- refundPolicyFactory: RefundPolicyFactory',
        '- pricingStrategyFactory: PricingStrategyFactory',
      ],
      methods: [
        '+ createFlight(..., pricingModel): Flight',
        '+ holdSeats(flightId, seats, userId): void',
        '+ bookFlight(flightId, seats, passengers, userId, payment, idemKey, fareType): Booking',
        '+ cancelBooking(bookingId): Booking',
        '+ scheduledStaleHoldCleanup(): void',
      ]
    },
    {
      name: 'AirlineRepository',
      stereotype: 'repository',
      fields: [
        '- aircrafts: ConcurrentHashMap<String, Aircraft>',
        '- flights: ConcurrentHashMap<String, Flight>',
        '- bookings: ConcurrentHashMap<String, Booking>',
        '- bookingsByUser: ConcurrentHashMap<String, List<String>>',
        '- bookingIdGen: AtomicLong'
      ],
      methods: [
        '+ saveFlight/findFlightById/getAllFlights(): ...',
        '+ saveBooking/findBookingById/getBookingsByUser(userId): ...',
        '+ nextBookingId(): String',
        '+ clear(): void'
      ]
    },
    {
      name: 'SeatLockManager',
      stereotype: 'concurrency',
      fields: ['- seatLocks: ConcurrentHashMap<String, ReentrantLock>'],
      methods: [
        '+ lockSeatsInOrder(flightId, seatNumbers): List<ReentrantLock>',
        '+ holdSeats(flightId, seats, userId, ttlMs, flight): void',
        '+ confirmSeats(flightId, seats, userId, flight): void',
        '+ releaseSeats(flightId, seats, flight): void',
        '+ expireStaleHolds(flight): void'
      ]
    },
    {
      name: 'PaymentProcessor',
      stereotype: 'service',
      fields: ['- paymentIdempotencyCache: ConcurrentHashMap<String, Payment>'],
      methods: ['+ processPayment(bookingId, amount, method, idemKey): Payment']
    },
    {
      name: 'PricingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ calculateSeatPrice(template, flight): double']
    },
    {
      name: 'ClassBasedPricingStrategy',
      stereotype: 'strategy',
      fields: ['- baseRate: double'],
      methods: ['+ calculateSeatPrice(template, flight): double']
    },
    {
      name: 'DemandSurgePricingStrategy',
      stereotype: 'strategy',
      fields: ['- baseStrategy: ClassBasedPricingStrategy'],
      methods: ['+ calculateSeatPrice(template, flight): double', '- surgeMultiplier(flight): double']
    },
    {
      name: 'PricingStrategyFactory',
      stereotype: 'factory',
      fields: ['- strategies: EnumMap<PricingModel, PricingStrategy>'],
      methods: ['+ forModel(model): PricingStrategy']
    },
    {
      name: 'RefundPolicy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ calculateRefund(booking, departureTime, cancelTime): double']
    },
    {
      name: 'TieredCancellationRefundPolicy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ calculateRefund(booking, departureTime, cancelTime): double']
    },
    {
      name: 'NonRefundableFarePolicy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ calculateRefund(booking, departureTime, cancelTime): double']
    },
    {
      name: 'RefundPolicyFactory',
      stereotype: 'factory',
      fields: ['- policies: EnumMap<FareType, RefundPolicy>'],
      methods: ['+ forFareType(fareType): RefundPolicy']
    },
    {
      name: 'Aircraft',
      stereotype: 'entity',
      fields: ['- model: String', '- tailNumber: String', '- seatTemplates: List<SeatTemplate>'],
      methods: ['+ getTotalSeats(): int', '+ static of(model, tailNumber, templates): Aircraft']
    },
    {
      name: 'SeatTemplate',
      stereotype: 'entity',
      fields: ['- seatNumber: String', '- seatClass: SeatClass', '- window: boolean', '- aisle: boolean'],
      methods: []
    },
    {
      name: 'Flight',
      stereotype: 'entity',
      fields: [
        '- flightId, flightNumber, source, destination: String',
        '- departureTime, arrivalTime: LocalDateTime',
        '- aircraft: Aircraft',
        '- seats: ConcurrentHashMap<String, Seat>'
      ],
      methods: [
        '+ static create(..., pricingStrategy): Flight',
        '+ getSeat(seatNumber): Seat',
        '+ getAllSeats(): List<Seat>',
        '+ getAvailableSeatsCount(): int'
      ]
    },
    {
      name: 'Seat',
      stereotype: 'entity',
      fields: [
        '- seatNumber: String', '- seatClass: SeatClass', '- basePrice: double',
        '- status: SeatStatus (volatile)', '- heldByUserId: String (volatile)',
        '- holdExpiresAt: long (volatile)', '- version: long (volatile)'
      ],
      methods: ['+ isAvailable(now): boolean']
    },
    {
      name: 'Passenger',
      stereotype: 'entity',
      fields: ['- passengerId, name, email, passportOrId: String'],
      methods: []
    },
    {
      name: 'Booking',
      stereotype: 'entity',
      fields: [
        '- bookingId, flightId, userId: String', '- passengers: List<Passenger>',
        '- seatNumbers: List<String>', '- totalAmount, refundAmount: double',
        '- status: BookingStatus', '- fareType: FareType',
        '- createdAt, cancelledAt: Instant'
      ],
      methods: []
    },
    {
      name: 'Payment',
      stereotype: 'entity',
      fields: [
        '- paymentId, bookingId: String', '- amount: double', '- paymentMethod: String',
        '- status: PaymentStatus', '- idempotencyKey: String', '- timestamp: Instant'
      ],
      methods: []
    },
    {
      name: 'SeatClass',
      stereotype: 'enum',
      fields: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
      methods: []
    },
    {
      name: 'SeatStatus',
      stereotype: 'enum',
      fields: ['AVAILABLE', 'HELD', 'BOOKED'],
      methods: []
    },
    {
      name: 'BookingStatus',
      stereotype: 'enum',
      fields: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'],
      methods: []
    },
    {
      name: 'FareType',
      stereotype: 'enum',
      fields: ['FLEXIBLE', 'BASIC'],
      methods: []
    },
    {
      name: 'PricingModel',
      stereotype: 'enum',
      fields: ['STANDARD', 'DEMAND_SURGE'],
      methods: []
    }
  ],
  relationships: [
    { from: 'AirlineController', to: 'AirlineService', label: 'delegates to' },
    { from: 'AirlineService', to: 'AirlineRepository', label: 'uses' },
    { from: 'AirlineService', to: 'SeatLockManager', label: 'delegates hold/confirm to' },
    { from: 'AirlineService', to: 'PaymentProcessor', label: 'charges via' },
    { from: 'AirlineService', to: 'RefundPolicyFactory', label: 'resolves refund via' },
    { from: 'AirlineService', to: 'PricingStrategyFactory', label: 'resolves fare via' },
    { from: 'PricingStrategyFactory', to: 'PricingStrategy', label: 'resolves' },
    { from: 'ClassBasedPricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'DemandSurgePricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'DemandSurgePricingStrategy', to: 'ClassBasedPricingStrategy', label: 'delegates base fare to' },
    { from: 'PricingStrategyFactory', to: 'PricingModel', label: 'keyed by' },
    { from: 'RefundPolicyFactory', to: 'RefundPolicy', label: 'resolves' },
    { from: 'TieredCancellationRefundPolicy', to: 'RefundPolicy', label: 'implements', dashed: true },
    { from: 'NonRefundableFarePolicy', to: 'RefundPolicy', label: 'implements', dashed: true },
    { from: 'RefundPolicyFactory', to: 'FareType', label: 'keyed by' },
    { from: 'Booking', to: 'FareType', label: 'booked under' },
    { from: 'Flight', to: 'PricingStrategy', label: 'priced at creation by' },
    { from: 'AirlineRepository', to: 'Aircraft', label: 'stores' },
    { from: 'AirlineRepository', to: 'Flight', label: 'stores' },
    { from: 'AirlineRepository', to: 'Booking', label: 'stores' },
    { from: 'Aircraft', to: 'SeatTemplate', label: 'defines layout via' },
    { from: 'Flight', to: 'Aircraft', label: 'flown by' },
    { from: 'Flight', to: 'Seat', label: 'has many' },
    { from: 'Seat', to: 'SeatTemplate', label: 'materialized from' },
    { from: 'Seat', to: 'SeatClass', label: 'has class' },
    { from: 'Seat', to: 'SeatStatus', label: 'has status' },
    { from: 'Booking', to: 'Flight', label: 'belongs to' },
    { from: 'Booking', to: 'Passenger', label: 'has many' },
    { from: 'Booking', to: 'BookingStatus', label: 'has state' },
    { from: 'PaymentProcessor', to: 'Payment', label: 'creates' },
    { from: 'Payment', to: 'Booking', label: 'settles' },
  ]
};

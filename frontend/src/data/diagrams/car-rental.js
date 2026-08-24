// classDiagrams — carRental
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Car Rental — Class Diagram',
  classes: [
    {
      name: 'CarRentalService',
      stereotype: 'facade',
      fields: [
        '- repository: CarRentalRepository',
        '- lockService: ReservationLockService',
        '- pricingFactory: PricingStrategyFactory',
        '- paymentProcessor: PaymentProcessor'
      ],
      methods: [
        '+ reserveVehicle(customerId, vehicleId, start, end): Reservation',
        '+ confirmReservation(reservationId, method): Reservation',
        '+ pickup(reservationId): Reservation',
        '+ returnVehicle(reservationId, odometer, actualReturnDate): Reservation',
        '+ cancelReservation(reservationId): Reservation',
        '+ searchAvailableVehicles(branchId, type, start, end): List<Vehicle>'
      ]
    },
    {
      name: 'ReservationLockService',
      fields: [
        '- vehicleLocks: Map<String, ReentrantLock>'
      ],
      methods: [
        '+ reserve(vehicleId, customerId, start, end, cost, strategyName): Reservation',
        '+ markPickedUp(vehicleId): void',
        '+ markReturned(vehicleId, odometer): void',
        '- overlaps(s1, e1, s2, e2): boolean'
      ]
    },
    {
      name: 'Vehicle',
      fields: [
        '- id: String',
        '- make: String',
        '- model: String',
        '- year: int',
        '- licensePlate: String',
        '- type: VehicleType',
        '- status: VehicleStatus',
        '- branchId: String',
        '- odometer: int'
      ],
      methods: []
    },
    {
      name: 'Customer',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- phone: String',
        '- licenseNumber: String'
      ],
      methods: []
    },
    {
      name: 'Reservation',
      fields: [
        '- id: String',
        '- customerId: String',
        '- vehicleId: String',
        '- branchId: String',
        '- startDate: LocalDate',
        '- endDate: LocalDate',
        '- status: ReservationStatus',
        '- estimatedCost: double',
        '- actualCost: Double',
        '- pricingStrategyName: String',
        '- paymentId: String'
      ],
      methods: []
    },
    {
      name: 'RentalBranch',
      fields: [
        '- id: String',
        '- name: String',
        '- address: String',
        '- city: String'
      ],
      methods: []
    },
    {
      name: 'VehicleType',
      stereotype: 'enum',
      fields: [
        'HATCHBACK(1200)',
        'SEDAN(1800)',
        'SUV(2800)',
        'VAN(3200)',
        'TRUCK(4000)'
      ],
      methods: [
        '+ getBaseDailyRate(): double'
      ]
    },
    {
      name: 'VehicleStatus',
      stereotype: 'enum',
      fields: [
        'AVAILABLE',
        'RENTED',
        'MAINTENANCE',
        'RETIRED'
      ],
      methods: []
    },
    {
      name: 'ReservationStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'CONFIRMED',
        'ACTIVE',
        'COMPLETED',
        'CANCELLED'
      ],
      methods: [
        '+ canTransitionTo(next): boolean',
        '+ blocksCalendar(): boolean',
        '+ isTerminal(): boolean'
      ]
    },
    {
      name: 'PricingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateCost(vehicleType, days): double',
        '+ getName(): String'
      ]
    },
    {
      name: 'StandardPricingStrategy',
      fields: ['implements PricingStrategy'],
      methods: ['+ calculateCost(...): double  // base rate, 1-2 days']
    },
    {
      name: 'WeeklyDiscountPricingStrategy',
      fields: ['implements PricingStrategy'],
      methods: ['+ calculateCost(...): double  // 10% off, 3-6 days']
    },
    {
      name: 'LongRentalDiscountPricingStrategy',
      fields: ['implements PricingStrategy'],
      methods: ['+ calculateCost(...): double  // 20% off, 7+ days']
    },
    {
      name: 'PricingStrategyFactory',
      fields: [
        '- standard: StandardPricingStrategy',
        '- weeklyDiscount: WeeklyDiscountPricingStrategy',
        '- longRentalDiscount: LongRentalDiscountPricingStrategy'
      ],
      methods: [
        '+ forDuration(days): PricingStrategy'
      ]
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- reservationId: String',
        '- amount: double',
        '- method: PaymentMethod',
        '- status: PaymentStatus'
      ],
      methods: []
    },
    {
      name: 'PaymentProcessor',
      methods: [
        '+ validate(payment): boolean',
        '+ process(payment): Payment',
        '+ refund(payment): Payment'
      ]
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      fields: ['CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'UPI'],
      methods: []
    },
    {
      name: 'CarRentalRepository',
      fields: [
        '- vehicles: ConcurrentHashMap',
        '- customers: ConcurrentHashMap',
        '- reservations: ConcurrentHashMap',
        '- branches: ConcurrentHashMap',
        '- payments: ConcurrentHashMap'
      ],
      methods: [
        '+ getReservationsForVehicle(vehicleId): List<Reservation>',
        '+ saveReservation()',
        '+ updateVehicle()'
      ]
    }
  ],
  relationships: [
    { from: 'CarRentalService', to: 'CarRentalRepository', label: 'uses' },
    { from: 'CarRentalService', to: 'ReservationLockService', label: 'delegates booking to' },
    { from: 'CarRentalService', to: 'PricingStrategyFactory', label: 'uses' },
    { from: 'CarRentalService', to: 'PaymentProcessor', label: 'uses' },
    { from: 'ReservationLockService', to: 'CarRentalRepository', label: 'reads/writes under lock' },
    { from: 'ReservationLockService', to: 'Reservation', label: 'creates' },
    { from: 'Customer', to: 'Reservation', label: 'makes' },
    { from: 'Reservation', to: 'Vehicle', label: 'books' },
    { from: 'Reservation', to: 'ReservationStatus', label: 'has state' },
    { from: 'Reservation', to: 'Payment', label: 'has' },
    { from: 'RentalBranch', to: 'Vehicle', label: 'hosts' },
    { from: 'Vehicle', to: 'VehicleType', label: 'has category' },
    { from: 'Vehicle', to: 'VehicleStatus', label: 'has status' },
    { from: 'StandardPricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'WeeklyDiscountPricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'LongRentalDiscountPricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'PricingStrategyFactory', to: 'PricingStrategy', label: 'creates' },
    { from: 'Payment', to: 'PaymentMethod', label: 'has method' },
    { from: 'PaymentProcessor', to: 'Payment', label: 'processes' }
  ]
};

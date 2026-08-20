// classDiagrams — uber
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Uber Cab Booking — Class Diagram',
  classes: [
    {
      name: 'UberService',
      methods: [
        '+ registerRider(rider): Rider',
        '+ registerDriver(driver): Driver',
        '+ estimate(pickup, dropoff, type): FareEstimate',
        '+ requestRide(userId, pickup, dropoff, type, fare, distance): Ride',
        '+ getAvailableRideRequestsForDriver(driverId): List<Ride>',
        '+ acceptRide(rideId, driverId): Ride',
        '+ declineRide(rideId, driverId): Ride',
        '+ verifyOtpAndStart(rideId, otp): Ride',
        '+ arriveAtDestination(rideId): Ride',
        '+ completeTrip(rideId, paymentMethod): Ride',
        '+ cancelTrip(rideId): Ride'
      ]
    },
    {
      name: 'User',
      stereotype: 'abstract',
      fields: [
        '# id: String',
        '# name: String',
        '# phone: String'
      ],
      methods: [
        '+ getId(): String',
        '+ getName(): String'
      ]
    },
    {
      name: 'Rider',
      fields: [
        '- currentLocation: Location'
      ],
      methods: [
        '+ getCurrentLocation(): Location'
      ]
    },
    {
      name: 'Driver',
      fields: [
        '- vehicleType: VehicleType',
        '- vehicleNumber: String',
        '- currentLocation: Location',
        '- status: DriverStatus'
      ],
      methods: [
        '+ isAvailable(): boolean',
        '+ setStatus(status): void'
      ]
    },
    {
      name: 'Ride',
      fields: [
        '- id: String',
        '- rider: Rider',
        '- driver: Driver',
        '- pickup: Location',
        '- dropoff: Location',
        '- distanceKm: double',
        '- fare: double',
        '- status: RideStatus',
        '- payment: Payment',
        '- otp: String',
        '- declinedDriverIds: Set<String>'
      ],
      methods: [
        '+ verifyOtp(input): boolean',
        '+ addDeclinedDriver(driverId): void',
        '+ isDeclinedBy(driverId): boolean'
      ]
    },
    {
      name: 'Location',
      fields: [
        '- latitude: double',
        '- longitude: double',
        '- label: String'
      ],
      methods: [
        '+ distanceTo(other): double'
      ]
    },
    {
      name: 'DriverStatus',
      stereotype: 'enum',
      fields: [
        'AVAILABLE',
        'ON_TRIP',
        'OFFLINE'
      ],
      methods: []
    },
    {
      name: 'RideStatus',
      stereotype: 'enum',
      fields: [
        'REQUESTED',
        'ACCEPTED',
        'ONGOING',
        'DESTINATION_REACHED',
        'PAYMENT_PENDING',
        'COMPLETED',
        'PAYMENT_FAILED',
        'CANCELLED'
      ],
      methods: []
    },
    {
      name: 'FareEstimate',
      stereotype: 'record',
      fields: [
        '- distanceKm: double',
        '- fare: double',
        '- estimatedMinutes: int',
        '- vehicleType: VehicleType'
      ],
      methods: []
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- tripId: String',
        '- amount: double',
        '- method: String',
        '- status: PaymentStatus'
      ],
      methods: [
        '+ setStatus(status): void'
      ]
    },
    {
      name: 'PaymentStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'COMPLETED',
        'FAILED'
      ],
      methods: []
    },
    {
      name: 'PaymentProcessor',
      methods: [
        '+ validate(payment): boolean',
        '+ process(payment): Payment'
      ]
    },
    {
      name: 'VehicleType',
      stereotype: 'enum',
      fields: [
        'UBER_GO',
        'UBER_XL',
        'UBER_PREMIUM'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Rider',
      to: 'User',
      label: 'extends',
      dashed: true
    },
    {
      from: 'Driver',
      to: 'User',
      label: 'extends',
      dashed: true
    },
    {
      from: 'UberService',
      to: 'Ride',
      label: 'manages'
    },
    {
      from: 'UberService',
      to: 'PaymentProcessor',
      label: 'uses'
    },
    {
      from: 'UberService',
      to: 'FareEstimate',
      label: 'returns'
    },
    {
      from: 'Ride',
      to: 'Rider',
      label: 'requested by'
    },
    {
      from: 'Ride',
      to: 'Driver',
      label: 'assigned to'
    },
    {
      from: 'Ride',
      to: 'RideStatus',
      label: 'has state'
    },
    {
      from: 'Ride',
      to: 'Payment',
      label: 'has payment'
    },
    {
      from: 'Driver',
      to: 'DriverStatus',
      label: 'has status'
    },
    {
      from: 'Driver',
      to: 'VehicleType',
      label: 'drives'
    },
    {
      from: 'Payment',
      to: 'PaymentStatus',
      label: 'has status'
    }
  ]
};

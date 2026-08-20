// designDetails — uber
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Uber Cab Booking — Design Details',
  tldr: [
    'Ride-hailing service with pre-booking fare estimation, explicit driver Accept/Decline request broadcasting, 4-digit OTP verification, and payment checkout',
    'Geospatial distance calculation (Haversine formula) for fare calculation based on pickup/dropoff coordinates',
    'Thread-safe driver availability management and multi-step ride lifecycle state transitions (REQUESTED → ACCEPTED → ONGOING → DESTINATION_REACHED / PAYMENT_PENDING → COMPLETED / PAYMENT_FAILED / CANCELLED)',
    'Decoupled rider payment checkout via PaymentProcessor with automatic driver relocation upon completion'
  ],
  requirements: [
    'Multi-vehicle support: UBER_GO (Base ₹25 + ₹12/km), UBER_XL (Base ₹25 + ₹18/km), UBER_PREMIUM (Base ₹25 + ₹25/km)',
    'Fare estimation: Calculate distance between pickup & dropoff coordinates and compute price & duration without assigning drivers upfront',
    'Driver Request Broadcast & Decision: Broadcast request to nearby drivers who can explicitly Accept or Decline',
    'OTP Security Verification: Rider receives 4-digit OTP that driver must verify to transition trip status to ONGOING',
    'Ride lifecycle transitions: REQUESTED → ACCEPTED → ONGOING → PAYMENT_PENDING → COMPLETED or CANCELLED',
    'Rider Payment Checkout: Rider selects payment method (UPI, Card, Cash) and executes payment after driver arrives at destination',
    'Driver availability: Assigned driver becomes ON_TRIP until payment completion; location updates to dropoff upon completion'
  ],
  entities: [
    {
      name: 'UberService',
      description: 'Core domain service. Handles fare estimation, driver matching, ride creation, OTP verification, and status updates.',
      fields: [
        {
          name: 'repository',
          type: 'UberRepository',
          description: 'Injected data store'
        },
        {
          name: 'paymentProcessor',
          type: 'PaymentProcessor',
          description: 'Payment gateway service'
        },
        {
          name: 'RATE_GO',
          type: 'double',
          description: 'Per km rate for UBER_GO (12.0)'
        },
        {
          name: 'RATE_XL',
          type: 'double',
          description: 'Per km rate for UBER_XL (18.0)'
        },
        {
          name: 'RATE_PREMIUM',
          type: 'double',
          description: 'Per km rate for UBER_PREMIUM (25.0)'
        }
      ],
      methods: [
        {
          name: 'estimate(...)',
          returns: 'FareEstimate',
          description: 'Computes distance, estimated duration, and fare price'
        },
        {
          name: 'requestRide(...)',
          returns: 'Ride',
          description: 'Creates ride request with pre-calculated fare and secret 4-digit OTP'
        },
        {
          name: 'acceptRide(rideId, driverId)',
          returns: 'Ride',
          description: 'Assigns driver to ride and sets status to ACCEPTED'
        },
        {
          name: 'declineRide(rideId, driverId)',
          returns: 'Ride',
          description: 'Marks ride as declined by specified driver'
        },
        {
          name: 'verifyOtpAndStart(rideId, otp)',
          returns: 'Ride',
          description: 'Verifies 4-digit secret OTP and sets status to ONGOING'
        },
        {
          name: 'arriveAtDestination(rideId)',
          returns: 'Ride',
          description: 'Driver marks destination arrival; sets status to PAYMENT_PENDING'
        },
        {
          name: 'completeTrip(rideId, paymentMethod)',
          returns: 'Ride',
          description: 'Processes rider payment; sets status to COMPLETED and releases driver'
        }
      ]
    },
    {
      name: 'UberRepository',
      description: 'In-memory repository managing Drivers and Rides state with thread safety.',
      fields: [
        {
          name: 'drivers',
          type: 'Map<String, Driver>',
          description: 'LinkedHashMap of drivers keyed by ID'
        },
        {
          name: 'rides',
          type: 'ConcurrentHashMap<String, Ride>',
          description: 'ConcurrentHashMap of all rides keyed by rideId'
        }
      ],
      methods: [
        {
          name: 'getAvailableRideRequestsForDriver(driverId)',
          returns: 'List<Ride>',
          description: 'Filters REQUESTED rides matching driver vehicle type and excluding declined drivers'
        },
        {
          name: 'saveRide(ride)',
          returns: 'void',
          description: 'Stores ride in repository'
        },
        {
          name: 'updateDriver(driver)',
          returns: 'void',
          description: 'Updates driver status and location'
        }
      ]
    },
    {
      name: 'Location',
      description: 'Geospatial coordinate value object containing latitude, longitude, and label.',
      fields: [
        {
          name: 'latitude',
          type: 'double',
          description: 'Latitude coordinate'
        },
        {
          name: 'longitude',
          type: 'double',
          description: 'Longitude coordinate'
        },
        {
          name: 'label',
          type: 'String',
          description: 'Human-readable address label'
        }
      ],
      methods: [
        {
          name: 'distanceTo(other)',
          returns: 'double',
          description: 'Calculates distance in kilometers using Haversine formula'
        }
      ]
    },
    {
      name: 'Ride',
      description: 'Entity representing a ride booking session across its complete lifecycle.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique ride ID (RIDE-00001)'
        },
        {
          name: 'userId',
          type: 'String',
          description: 'Passenger ID'
        },
        {
          name: 'driverId',
          type: 'String',
          description: 'Assigned driver ID'
        },
        {
          name: 'pickup',
          type: 'Location',
          description: 'Pickup location'
        },
        {
          name: 'dropoff',
          type: 'Location',
          description: 'Dropoff location'
        },
        {
          name: 'fare',
          type: 'double',
          description: 'Total calculated fare'
        },
        {
          name: 'otp',
          type: 'String',
          description: 'Secret 4-digit verification OTP'
        },
        {
          name: 'declinedDriverIds',
          type: 'Set<String>',
          description: 'Set of drivers who declined the request'
        },
        {
          name: 'status',
          type: 'RideStatus',
          description: 'REQUESTED, ACCEPTED, ONGOING, DESTINATION_REACHED, PAYMENT_PENDING, COMPLETED, PAYMENT_FAILED, CANCELLED'
        }
      ],
      methods: [
        {
          name: 'verifyOtp(input)',
          returns: 'boolean',
          description: 'Checks if provided OTP matches ride secret OTP'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State Pattern / State Machine',
      used: true,
      explanation: 'Rides progress through strict state transitions (REQUESTED → ACCEPTED → ONGOING → PAYMENT_PENDING → COMPLETED / PAYMENT_FAILED / CANCELLED). Side-effects like driver release and relocation trigger automatically on status changes.'
    },
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Fare rates and driver matching vary dynamically based on VehicleType strategies (UBER_GO, UBER_XL, UBER_PREMIUM).'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'UberRepository encapsulates data access and storage for drivers and rides.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'Location handles coordinate math; Driver manages vehicle state; PaymentProcessor handles transactions; UberService handles business logic; UberRepository manages persistence.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'New vehicle types (e.g. UBER_POOL, UBER_BLACK) can be added to VehicleType enum with custom rates without altering core ride state logic.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation & Value Objects',
      description: 'Location is an immutable value object encapsulating distance formula calculation (`distanceTo`).'
    },
    {
      name: 'Enum-based State Management',
      description: 'RideStatus and VehicleType enums provide type-safe states and configuration lookup.'
    }
  ],
  extensibility: [
    {
      area: 'Surge Pricing (Dynamic Strategy)',
      description: 'Add a SurgePricingStrategy multiplier based on demand/supply ratio in a geographic cluster.',
      difficulty: 'Medium'
    },
    {
      area: 'Real-time Driver GPS Tracking',
      description: 'Stream driver GPS coordinates during ONGOING state via WebSockets.',
      difficulty: 'Medium'
    },
    {
      area: 'Driver Rating System',
      description: 'Allow riders to rate drivers post COMPLETED status, updating driver average rating.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Used geospatial coordinate distance over flat Euclidean distance for accurate real-world distance metrics.',
    'Decoupled driver ride request broadcasting so drivers can explicitly Accept or Decline pending requests.',
    'Separated destination arrival (PAYMENT_PENDING) from trip payment completion (COMPLETED) to mirror real-world rider checkout.',
    'In-memory ConcurrentHashMap for ride storage provides instant lookups and high throughput.'
  ]
};

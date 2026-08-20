// designDetails — hotel
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Hotel Management — Design Details',
  requirements: [
    'Hotel management system with multiple hotels, rooms, and bookings',
    'Each hotel has a name, location, rating, and list of amenities',
    'Rooms are categorized as SINGLE, DOUBLE, SUITE, or DELUXE with different pricing',
    'Room states: AVAILABLE, BOOKED, OCCUPIED, MAINTENANCE — only AVAILABLE rooms can be booked',
    'Booking flow: book room (CONFIRMED) → check in (CHECKED_IN) → check out (CHECKED_OUT)',
    'Booking has associated guest name, check-in/out dates, and total amount (price × nights)',
    'Cancellation is allowed for CONFIRMED and CHECKED_IN bookings, restores room to AVAILABLE',
    'Thread-safe concurrent access via ReentrantLock — multiple guests can book simultaneously'
  ],
  entities: [
    {
      name: 'HotelService',
      description: 'Core business logic layer. Handles hotel search, room listing, booking, check-in, check-out, and cancellation. All booking state mutations are protected by ReentrantLock.',
      fields: [
        {
          name: 'repository',
          type: 'HotelRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic booking state transitions'
        }
      ],
      methods: [
        {
          name: 'getAllHotels()',
          returns: 'List<Hotel>',
          description: 'Returns all hotels in the system'
        },
        {
          name: 'getAvailableRooms(hotelId, dates)',
          returns: 'List<Room>',
          description: 'Returns available rooms for a hotel (simplified — all AVAILABLE status rooms)'
        },
        {
          name: 'bookRoom(roomId, userId, guestName, dates)',
          returns: 'Booking',
          description: 'Validates room availability → calculates total → marks room BOOKED → creates booking'
        },
        {
          name: 'checkIn(bookingId)',
          returns: 'Booking',
          description: 'Marks booking CHECKED_IN and room OCCUPIED'
        },
        {
          name: 'checkOut(bookingId)',
          returns: 'Booking',
          description: 'Marks booking CHECKED_OUT and room AVAILABLE'
        },
        {
          name: 'cancelBooking(bookingId)',
          returns: 'Booking',
          description: 'Cancels booking and restores room to AVAILABLE'
        }
      ]
    },
    {
      name: 'HotelRepository',
      description: 'In-memory data store using ConcurrentHashMap and ReentrantLock for thread safety.',
      fields: [
        {
          name: 'hotels',
          type: 'Map<String, Hotel>',
          description: 'All hotels indexed by ID (LinkedHashMap preserves order)'
        },
        {
          name: 'rooms',
          type: 'ConcurrentHashMap<String, Room>',
          description: 'All rooms indexed by ID'
        },
        {
          name: 'bookings',
          type: 'ConcurrentHashMap<String, Booking>',
          description: 'All bookings indexed by ID'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic write operations'
        }
      ],
      methods: [
        {
          name: 'getAvailableRooms(hotelId)',
          returns: 'List<Room>',
          description: 'Filters rooms by hotel and AVAILABLE status'
        },
        {
          name: 'generateBookingId()',
          returns: 'String',
          description: 'Atomic counter — produces "HBK-00001" format'
        },
        {
          name: 'saveBooking(booking)',
          returns: 'void',
          description: 'Thread-safe booking insert'
        },
        {
          name: 'getActiveBookings()',
          returns: 'List<Booking>',
          description: 'Returns CONFIRMED and CHECKED_IN bookings, sorted newest first'
        }
      ]
    },
    {
      name: 'Hotel',
      description: 'A hotel property with basic information and amenities.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique identifier (H1, H2)'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Hotel display name, e.g. Grand Palace'
        },
        {
          name: 'location',
          type: 'String',
          description: 'City/location, e.g. Mumbai'
        },
        {
          name: 'rating',
          type: 'double',
          description: 'Star rating out of 5'
        },
        {
          name: 'amenities',
          type: 'List<String>',
          description: 'Facilities like Pool, Gym, Spa, WiFi'
        }
      ],
      methods: []
    },
    {
      name: 'Room',
      description: 'A bookable room with type, pricing, and availability status.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique identifier (R1, R2)'
        },
        {
          name: 'roomNumber',
          type: 'String',
          description: 'Physical room number, e.g. 101'
        },
        {
          name: 'type',
          type: 'RoomType (enum)',
          description: 'SINGLE (₹3K), DOUBLE (₹5K), SUITE (₹12K), DELUXE (₹8K)'
        },
        {
          name: 'price',
          type: 'double',
          description: 'Per-night price in INR'
        },
        {
          name: 'status',
          type: 'RoomStatus (enum)',
          description: 'AVAILABLE, BOOKED, OCCUPIED, or MAINTENANCE'
        }
      ],
      methods: [
        {
          name: 'setStatus(status)',
          returns: 'void',
          description: 'Transitions room state, controlled by service'
        }
      ]
    },
    {
      name: 'Booking',
      description: 'A confirmed room reservation with guest info and payment details.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique booking identifier (HBK-00001)'
        },
        {
          name: 'roomId',
          type: 'String',
          description: 'Which room is booked'
        },
        {
          name: 'guestName',
          type: 'String',
          description: 'Name of the guest staying'
        },
        {
          name: 'checkIn',
          type: 'LocalDate',
          description: 'Check-in date'
        },
        {
          name: 'checkOut',
          type: 'LocalDate',
          description: 'Check-out date'
        },
        {
          name: 'status',
          type: 'BookingStatus (enum)',
          description: 'CONFIRMED → CHECKED_IN → CHECKED_OUT or CANCELLED'
        },
        {
          name: 'totalAmount',
          type: 'double',
          description: 'price × nights'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'HotelRepository abstracts all data access behind semantic methods. The service never touches maps directly — it calls getRoom(), generateBookingId(), and saveBooking(). This keeps business logic clean and enables testing with mock repositories.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring @Service and @Repository are singletons, ensuring one consistent state across all requests. Critical since all data lives in memory and must be shared across concurrent users.'
    },
    {
      name: 'Dependency Injection (IoC)',
      used: true,
      explanation: 'HotelService receives HotelRepository via constructor injection. Spring auto-wires the dependency, making the service testable without Spring container and allowing repository swaps.'
    },
    {
      name: 'State Pattern',
      used: true,
      explanation: 'Room and Booking use enum-based state machines. Room: AVAILABLE → BOOKED → OCCUPIED → AVAILABLE. Booking: CONFIRMED → CHECKED_IN → CHECKED_OUT. Each service method checks the current state and transitions accordingly, preventing invalid transitions.'
    },
    {
      name: 'Unit of Work',
      used: true,
      explanation: 'bookRoom() wraps room status change + booking creation in a single ReentrantLock block. If any step fails, no partial state is committed. checkOut() similarly atomically updates both booking and room.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'HotelService handles booking business logic (validation, pricing, state transitions). HotelRepository manages data storage. HotelController handles HTTP concerns. Each has one clear responsibility.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'Adding a new room type requires only adding an enum constant and pricing. New room statuses can be added without changing booking flow. The system is open for extension of room types and statuses.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'HotelService depends on HotelRepository abstraction. Spring injects the concrete implementation. Switching from in-memory to database requires only a new repository implementation.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Room status validation is centralized in bookRoom/checkIn/checkOut methods. Booking ID generation is in one place. Amount calculation uses a single formula (price × nights).'
    },
    {
      name: 'Fail-Fast Validation',
      description: 'Each operation validates state before making changes: bookRoom checks AVAILABLE, checkIn checks CONFIRMED, checkOut checks CHECKED_IN. Invalid transitions are rejected immediately.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — State Machine',
      description: 'Room and Booking statuses are only modified through controlled service methods. External code cannot directly change room status from AVAILABLE to OCCUPIED without going through checkIn().',
      alternative: 'Could expose public setters. Controlled mutation via service is chosen because it enforces business rules (only CHECKED_IN bookings can transition to CHECKED_OUT).'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Booking contains roomId (reference to Room) and hotelId. Room contains a hotelId reference. Entities are linked by ID rather than through inheritance hierarchies.',
      alternative: 'Could make Booking extend Room. Composition is chosen because a Booking is not a type of Room — it represents a temporary usage of a room.'
    },
    {
      name: 'Enum-based State Machine',
      description: 'RoomStatus and BookingStatus enums define valid states and transitions. Service methods check current state before transitioning, making the state machine explicit and type-safe.',
      alternative: 'Could use String status fields. Enums are chosen because they are type-safe, self-documenting, and prevent invalid status values at compile time.'
    }
  ],
  extensibility: [
    {
      area: 'Dynamic Pricing (Seasonal/Holiday)',
      description: 'Add a pricing strategy that adjusts room prices based on season, day of week, or occupancy. Can be implemented as a PricingStrategy interface without changing booking flow.',
      difficulty: 'Easy'
    },
    {
      area: 'Room Service / Addons',
      description: 'Add ServiceRequest entity (room service, housekeeping, spa). Booking can have optional addons. Extends booking without changing core check-in/out flow.',
      difficulty: 'Medium'
    },
    {
      area: 'Multiple Locations / Search',
      description: 'Extend search to support city, date range, guests count, room type filter. Add caching for popular searches. No changes to booking flow.',
      difficulty: 'Medium'
    },
    {
      area: 'Online Payment Gateway',
      description: 'Add PaymentService interface. Call payment.process(amount) during booking creation. Refund on cancellation. Existing amount calculation unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Loyalty Program',
      description: 'Add loyalty points per booking (₹1 = 1 point). Redeem points for discounts. Track member tiers (Silver/Gold/Platinum) with tier-based benefits.',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Implement JpaHotelRepository. Swap via Spring @Profile. No service layer changes needed due to Dependency Injection.',
      difficulty: 'Medium'
    }
  ]
};

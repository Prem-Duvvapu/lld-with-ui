// designDetails — carRental
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Car Rental — Design Details',
  requirements: [
    'Vehicle fleet management — add, update, remove vehicles with details (make, model, year, license plate, type, status)',
    'Vehicle states: AVAILABLE, RESERVED, RENTED, MAINTENANCE, RETIRED — only AVAILABLE vehicles can be reserved',
    'Customer registration — customers can sign up with license, insurance, payment info and view rental history',
    'Reservation system — customer selects vehicle, dates, and location; reservation holds the vehicle and calculates estimated cost',
    'Branch-based operations — vehicles are distributed across rental branches; customers pick up and return at branches',
    'Pricing with variable rates — daily rate varies by vehicle type, rental duration (longer = discount), and season',
    'Vehicle pickup and return workflow — pickup activates rental, return calculates actual cost (including late fees and mileage), processes payment',
    'Payment processing — multiple payment methods (credit card, debit card, wallet) with authorization and capture flow'
  ],
  entities: [
    {
      name: 'RentalService',
      description: 'Core business logic orchestrator. Handles reservation, pickup, return, and cancellation workflows. Coordinates between Inventory, Pricing, and Payment services.',
      fields: [
        {
          name: 'inventoryService',
          type: 'InventoryService',
          description: 'Manages vehicle availability per branch'
        },
        {
          name: 'reservationRepo',
          type: 'Repository<Reservation>',
          description: 'Data store for all reservations'
        },
        {
          name: 'pricingStrategy',
          type: 'PricingStrategy',
          description: 'Calculates rental cost based on vehicle, duration, and modifiers'
        }
      ],
      methods: [
        {
          name: 'reserveVehicle(customerId, vehicleType, dates, branch)',
          returns: 'Reservation',
          description: 'Creates a reservation with estimated cost'
        },
        {
          name: 'pickup(reservationId)',
          returns: 'Rental',
          description: 'Activates rental, changes vehicle to RENTED'
        },
        {
          name: 'returnVehicle(rentalId, odometerReading)',
          returns: 'Invoice',
          description: 'Calculates final cost, processes payment, generates invoice'
        },
        {
          name: 'cancelReservation(reservationId)',
          returns: 'void',
          description: 'Cancels reservation and releases vehicle hold'
        }
      ]
    },
    {
      name: 'Vehicle',
      description: 'Rental vehicle with identification, classification, status tracking, and maintenance history.',
      fields: [
        {
          name: 'licensePlate',
          type: 'String',
          description: 'Unique vehicle identifier'
        },
        {
          name: 'make',
          type: 'String',
          description: 'Manufacturer (Toyota, Honda, BMW)'
        },
        {
          name: 'model',
          type: 'String',
          description: 'Model name/number'
        },
        {
          name: 'year',
          type: 'int',
          description: 'Manufacturing year'
        },
        {
          name: 'type',
          type: 'VehicleType',
          description: 'CAR, SUV, TRUCK, VAN, LUXURY'
        },
        {
          name: 'status',
          type: 'VehicleStatus',
          description: 'AVAILABLE, RESERVED, RENTED, MAINTENANCE, RETIRED'
        },
        {
          name: 'currentBranch',
          type: 'RentalBranch',
          description: 'Branch where vehicle is currently located'
        },
        {
          name: 'odometer',
          type: 'int',
          description: 'Current mileage reading'
        }
      ],
      methods: [
        {
          name: 'changeStatus(newStatus)',
          returns: 'void',
          description: 'Updates vehicle status with validation'
        },
        {
          name: 'moveToBranch(branch)',
          returns: 'void',
          description: 'Transfers vehicle to a different branch'
        }
      ]
    },
    {
      name: 'Customer',
      description: 'Renter with personal details, payment methods, driving credentials, and rental history.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique customer identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Full name as on license'
        },
        {
          name: 'licenseNumber',
          type: 'String',
          description: 'Valid driving license identifier'
        },
        {
          name: 'paymentMethods',
          type: 'List<PaymentMethod>',
          description: 'Saved payment methods for checkout'
        },
        {
          name: 'rentalHistory',
          type: 'List<Rental>',
          description: 'Past and current rentals'
        }
      ],
      methods: [
        {
          name: 'addPaymentMethod(method)',
          returns: 'void',
          description: 'Adds a new payment method for future rentals'
        },
        {
          name: 'getActiveRentals()',
          returns: 'List<Rental>',
          description: 'Returns rentals currently in progress'
        }
      ]
    },
    {
      name: 'Reservation',
      description: 'Holds a vehicle for a customer for specific dates. Has status: PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique reservation identifier'
        },
        {
          name: 'customer',
          type: 'Customer',
          description: 'Customer who made the reservation'
        },
        {
          name: 'vehicle',
          type: 'Vehicle',
          description: 'Reserved vehicle'
        },
        {
          name: 'pickupDate',
          type: 'LocalDateTime',
          description: 'Scheduled pickup time'
        },
        {
          name: 'returnDate',
          type: 'LocalDateTime',
          description: 'Scheduled return time'
        },
        {
          name: 'pickupBranch',
          type: 'RentalBranch',
          description: 'Branch for vehicle pickup'
        },
        {
          name: 'estimatedCost',
          type: 'double',
          description: 'Pre-rental cost estimate'
        },
        {
          name: 'status',
          type: 'ReservationStatus',
          description: 'PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED'
        }
      ],
      methods: [
        {
          name: 'confirm()',
          returns: 'void',
          description: 'Confirms reservation (payment authorization)'
        },
        {
          name: 'cancel()',
          returns: 'void',
          description: 'Cancels reservation and releases vehicle'
        }
      ]
    },
    {
      name: 'RentalBranch',
      description: 'Physical location where vehicles are parked and customers pick up/return cars. Manages local inventory.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique branch identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Branch name/location'
        },
        {
          name: 'address',
          type: 'String',
          description: 'Physical address'
        },
        {
          name: 'inventory',
          type: 'List<Vehicle>',
          description: 'Vehicles currently at this branch'
        }
      ],
      methods: [
        {
          name: 'addVehicle(vehicle)',
          returns: 'void',
          description: 'Adds a new vehicle to branch inventory'
        },
        {
          name: 'removeVehicle(vehicle)',
          returns: 'void',
          description: 'Removes a vehicle from the branch'
        },
        {
          name: 'findAvailableVehicles(type, dates)',
          returns: 'List<Vehicle>',
          description: 'Searches for available vehicles matching criteria'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'PricingStrategy interface with DailyRateStrategy, SeasonalStrategy, LoyaltyDiscountStrategy, LongRentalDiscountStrategy. RentalService delegates pricing to composed strategy.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'RentalService, InventoryService, and PaymentService are singletons ensuring consistent state. A single RentalService prevents double-booking of vehicles.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'VehicleFactory creates Vehicle instances with proper initial state. ReservationFactory creates reservations with correct status flow and generates IDs.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'VehicleStatus enum implements State pattern. AVAILABLE goes to RESERVED or MAINTENANCE. RENTED goes to AVAILABLE (after return). Invalid transitions are rejected.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'When a vehicle becomes AVAILABLE, interested customers could be notified via an AvailabilityObserver without RentalService managing notification logic.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'RentalService handles rental workflow. PricingStrategy calculates costs. RentalBranch manages local inventory. PaymentService processes transactions. Vehicle tracks its own state.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New pricing strategies implement PricingStrategy. New vehicle types add a constant. New payment gateways implement PaymentGateway. Core rental workflow unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'RentalService depends on PricingStrategy and PaymentGateway interfaces. Branches depend on Vehicle abstractions. High-level policies don\'t depend on low-level details.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Vehicle availability checking is in RentalBranch, not duplicated per service call. Cost calculation is delegated to PricingStrategy. Payment processing is centralized.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any PricingStrategy (DailyRate, Seasonal, Loyalty) can substitute another. Any PaymentGateway (Stripe, PayPal) is interchangeable without breaking RentalService.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Pricing Strategies',
      description: 'RentalService calls calculatePrice() on PricingStrategy interface. Different strategies implement pricing differently and can be composed (e.g., DailyRate + Seasonal surcharge).',
      alternative: 'Could have a single method with if-else for each factor. Strategy pattern is more flexible as pricing rules change independently.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'RentalBranch has-a List of Vehicle. Customer has-a List of PaymentMethod. Reservation has-a Customer and Vehicle. System composes entities rather than deep hierarchies.',
      alternative: 'Could extend a BaseEntity for all objects. Composition is chosen because relationships are structural aggregations.'
    },
    {
      name: 'Encapsulation — Vehicle Status',
      description: 'Vehicle encapsulates status with changeStatus() validating state transitions. External code cannot set status directly, preventing illegal states like renting a MAINTENANCE vehicle.',
      alternative: 'Could expose setStatus() setter. Encapsulated transitions enforce business rules at the model level.'
    }
  ],
  extensibility: [
    {
      area: 'New Vehicle Type',
      description: 'Add constant to VehicleType enum. Define daily rate. Add to branch inventory. No structural changes to rental workflow.',
      difficulty: 'Easy'
    },
    {
      area: 'Insurance Add-on',
      description: 'Add InsuranceOption entity linked to Reservation with tiers (Basic, Premium, Zero-Deductible). PricingStrategy includes insurance in total calculation.',
      difficulty: 'Easy'
    },
    {
      area: 'One-Way Rental',
      description: 'Allow returning vehicle to a different branch. Add dropBranch to Reservation. On return, vehicle transfers to dropBranch inventory. Pricing includes one-way fee.',
      difficulty: 'Medium'
    },
    {
      area: 'Loyalty Program',
      description: 'Add LoyaltyProgram with tiers (Silver, Gold, Platinum). Implement LoyaltyPricingStrategy for tier-based discounts. Points earned per rental redeemable for free days.',
      difficulty: 'Medium'
    }
  ]
};

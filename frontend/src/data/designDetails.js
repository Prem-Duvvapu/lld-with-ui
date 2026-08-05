const designDetails = {
  uber: {
    title: 'Uber Cab Booking — Design Details',
    tldr: [
      'Ride-hailing service with pre-booking fare estimation, explicit driver Accept/Decline request broadcasting, 4-digit OTP verification, and payment checkout',
      'Geospatial distance calculation (Haversine formula) for fare calculation based on pickup/dropoff coordinates',
      'Thread-safe driver availability management and multi-step ride lifecycle state transitions (REQUESTED → ACCEPTED → ONGOING → DESTINATION_REACHED / PAYMENT_PENDING → COMPLETED / PAYMENT_FAILED / CANCELLED)',
      'Decoupled rider payment checkout via PaymentProcessor with automatic driver relocation upon completion'
    ],
    tradeoffs: [
      'Used geospatial coordinate distance over flat Euclidean distance for accurate real-world distance metrics.',
      'Decoupled driver ride request broadcasting so drivers can explicitly Accept or Decline pending requests.',
      'Separated destination arrival (PAYMENT_PENDING) from trip payment completion (COMPLETED) to mirror real-world rider checkout.',
      'In-memory ConcurrentHashMap for ride storage provides instant lookups and high throughput.'
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
          { name: 'repository', type: 'UberRepository', description: 'Injected data store' },
          { name: 'paymentProcessor', type: 'PaymentProcessor', description: 'Payment gateway service' },
          { name: 'RATE_GO', type: 'double', description: 'Per km rate for UBER_GO (12.0)' },
          { name: 'RATE_XL', type: 'double', description: 'Per km rate for UBER_XL (18.0)' },
          { name: 'RATE_PREMIUM', type: 'double', description: 'Per km rate for UBER_PREMIUM (25.0)' }
        ],
        methods: [
          { name: 'estimate(...)', returns: 'FareEstimate', description: 'Computes distance, estimated duration, and fare price' },
          { name: 'requestRide(...)', returns: 'Ride', description: 'Creates ride request with pre-calculated fare and secret 4-digit OTP' },
          { name: 'acceptRide(rideId, driverId)', returns: 'Ride', description: 'Assigns driver to ride and sets status to ACCEPTED' },
          { name: 'declineRide(rideId, driverId)', returns: 'Ride', description: 'Marks ride as declined by specified driver' },
          { name: 'verifyOtpAndStart(rideId, otp)', returns: 'Ride', description: 'Verifies 4-digit secret OTP and sets status to ONGOING' },
          { name: 'arriveAtDestination(rideId)', returns: 'Ride', description: 'Driver marks destination arrival; sets status to PAYMENT_PENDING' },
          { name: 'completeTrip(rideId, paymentMethod)', returns: 'Ride', description: 'Processes rider payment; sets status to COMPLETED and releases driver' }
        ]
      },
      {
        name: 'UberRepository',
        description: 'In-memory repository managing Drivers and Rides state with thread safety.',
        fields: [
          { name: 'drivers', type: 'Map<String, Driver>', description: 'LinkedHashMap of drivers keyed by ID' },
          { name: 'rides', type: 'ConcurrentHashMap<String, Ride>', description: 'ConcurrentHashMap of all rides keyed by rideId' }
        ],
        methods: [
          { name: 'getAvailableRideRequestsForDriver(driverId)', returns: 'List<Ride>', description: 'Filters REQUESTED rides matching driver vehicle type and excluding declined drivers' },
          { name: 'saveRide(ride)', returns: 'void', description: 'Stores ride in repository' },
          { name: 'updateDriver(driver)', returns: 'void', description: 'Updates driver status and location' }
        ]
      },
      {
        name: 'Location',
        description: 'Geospatial coordinate value object containing latitude, longitude, and label.',
        fields: [
          { name: 'latitude', type: 'double', description: 'Latitude coordinate' },
          { name: 'longitude', type: 'double', description: 'Longitude coordinate' },
          { name: 'label', type: 'String', description: 'Human-readable address label' }
        ],
        methods: [
          { name: 'distanceTo(other)', returns: 'double', description: 'Calculates distance in kilometers using Haversine formula' }
        ]
      },
      {
        name: 'Ride',
        description: 'Entity representing a ride booking session across its complete lifecycle.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique ride ID (RIDE-00001)' },
          { name: 'userId', type: 'String', description: 'Passenger ID' },
          { name: 'driverId', type: 'String', description: 'Assigned driver ID' },
          { name: 'pickup', type: 'Location', description: 'Pickup location' },
          { name: 'dropoff', type: 'Location', description: 'Dropoff location' },
          { name: 'fare', type: 'double', description: 'Total calculated fare' },
          { name: 'otp', type: 'String', description: 'Secret 4-digit verification OTP' },
          { name: 'declinedDriverIds', type: 'Set<String>', description: 'Set of drivers who declined the request' },
          { name: 'status', type: 'RideStatus', description: 'REQUESTED, ACCEPTED, ONGOING, DESTINATION_REACHED, PAYMENT_PENDING, COMPLETED, PAYMENT_FAILED, CANCELLED' }
        ],
        methods: [
          { name: 'verifyOtp(input)', returns: 'boolean', description: 'Checks if provided OTP matches ride secret OTP' }
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
    ]
  },

  zomato: {
    title: 'Zomato Food Delivery — Design Details',
    tldr: [
      'Multi-entity online food delivery service connecting Customers, Restaurants, and Delivery Agents',
      'Full order state machine lifecycle: PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED (or CANCELLED)',
      'Security-verified OTP delivery handoff (4-digit random OTP generated on order creation, verified by agent on delivery)',
      'Multi-payment support (UPI, Credit Card, Debit Card, NetBanking, COD, Wallet) with transaction status tracking & automatic refunds on cancellation',
      'Thread-safe in-memory ConcurrentHashMap repository guarded by ReentrantLock for high-concurrency order placement and agent matching',
      'Real-time Notification Service broadcasting events to Customer, Restaurant, and Delivery Agent'
    ],
    tradeoffs: [
      'Used explicit OTP delivery verification to mirror real-world contactless/secure delivery handoffs.',
      'Decoupled agent assignment: if no delivery agent is online during READY_FOR_PICKUP, order remains queued until an agent comes online.',
      'In-memory ConcurrentHashMap + ReentrantLock chosen over external database for zero-latency SDE-2 interactive interview simulation.',
      'Synchronous payment authorization during placeOrder simplifies transaction guarantees while supporting immediate cancellation refunds.'
    ],
    requirements: [
      'Customer Management: Registration, profile details, delivery address, and order history tracking',
      'Restaurant Catalog: Browse restaurants, view cuisine/rating, toggle open/closed status, manage menus with veg/non-veg flags & price updates',
      'Menu Management: Categorized items (Appetizers, Main Course, Desserts, Beverages) with individual stock availability',
      'Order Placement: Select items & quantities, apply delivery fee (₹35) & tax (5%), choose payment method (UPI/Card/COD/Wallet)',
      '4-Digit OTP Handoff: Secret verification PIN generated per order for secure delivery completion',
      'Delivery Agent Matching: Automatic/manual assignment of available agents upon kitchen marking order READY_FOR_PICKUP',
      'State Machine & Order Tracking: PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED / CANCELLED',
      'Real-time Notifications: Event-driven notifications dispatched to Customer, Restaurant, and Delivery Agent'
    ],
    entities: [
      {
        name: 'ZomatoService',
        description: 'Core domain service layer implementing Singleton business logic for customer registration, menu management, order placement, state machine transitions, OTP verification, agent matching, and notification dispatching.',
        fields: [
          { name: 'repository', type: 'ZomatoRepository', description: 'Injected thread-safe repository' }
        ],
        methods: [
          { name: 'registerCustomer(...)', returns: 'Customer', description: 'Registers customer profile' },
          { name: 'getRestaurants()', returns: 'List<Restaurant>', description: 'Fetches list of all restaurants' },
          { name: 'updateMenuItemAvailability(...)', returns: 'Restaurant', description: 'Toggles item in-stock status' },
          { name: 'placeOrder(...)', returns: 'Order', description: 'Validates cart, processes payment, generates 4-digit OTP, creates order' },
          { name: 'confirmOrder(orderId)', returns: 'Order', description: 'Restaurant accepts incoming order' },
          { name: 'startPreparingOrder(orderId)', returns: 'Order', description: 'Kitchen begins cooking food' },
          { name: 'markReadyForPickup(orderId)', returns: 'Order', description: 'Kitchen completes food; matches & assigns available delivery agent' },
          { name: 'verifyOtpAndDeliver(orderId, otp)', returns: 'Order', description: 'Verifies customer OTP, marks DELIVERED, and frees delivery agent' },
          { name: 'cancelOrder(orderId, reason)', returns: 'Order', description: 'Cancels order prior to pickup, refunds payment, and notifies parties' }
        ]
      },
      {
        name: 'Customer',
        description: 'Represents a customer who browses menus and places orders.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique customer identifier' },
          { name: 'name', type: 'String', description: 'Customer full name' },
          { name: 'email', type: 'String', description: 'Email address' },
          { name: 'phone', type: 'String', description: 'Phone number' },
          { name: 'deliveryAddress', type: 'String', description: 'Primary delivery address' }
        ],
        methods: []
      },
      {
        name: 'Restaurant',
        description: 'Represents a food provider with address, rating, open status, and menu catalog.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique restaurant ID' },
          { name: 'name', type: 'String', description: 'Restaurant name' },
          { name: 'address', type: 'String', description: 'Physical address' },
          { name: 'cuisine', type: 'String', description: 'Cuisine type (e.g. North Indian, Fast Food, Asian)' },
          { name: 'rating', type: 'double', description: 'Average rating out of 5.0' },
          { name: 'open', type: 'boolean', description: 'Operating status flag' },
          { name: 'menu', type: 'List<MenuItem>', description: 'List of menu items offered' }
        ],
        methods: [
          { name: 'addMenuItem(item)', returns: 'void', description: 'Adds new menu item' },
          { name: 'removeMenuItem(itemId)', returns: 'void', description: 'Removes item from menu' }
        ]
      },
      {
        name: 'MenuItem',
        description: 'Individual food item in a restaurant menu.',
        fields: [
          { name: 'id', type: 'String', description: 'Menu item ID' },
          { name: 'name', type: 'String', description: 'Item name' },
          { name: 'description', type: 'String', description: 'Ingredients & description' },
          { name: 'price', type: 'double', description: 'Unit price in ₹' },
          { name: 'category', type: 'String', description: 'Category (Burgers, Pizzas, Desserts, Beverages)' },
          { name: 'isVeg', type: 'boolean', description: 'Vegetarian indicator flag' },
          { name: 'available', type: 'boolean', description: 'Stock availability status' }
        ],
        methods: []
      },
      {
        name: 'Order',
        description: 'Core aggregate root representing a customer order, item breakdown, fees, payment, status, assigned agent, and secret OTP.',
        fields: [
          { name: 'id', type: 'String', description: 'Order ID' },
          { name: 'customerId', type: 'String', description: 'Customer ID' },
          { name: 'restaurantId', type: 'String', description: 'Restaurant ID' },
          { name: 'items', type: 'List<OrderItem>', description: 'List of selected items & quantities' },
          { name: 'itemTotal', type: 'double', description: 'Subtotal price of items' },
          { name: 'deliveryFee', type: 'double', description: 'Delivery surcharge (₹35)' },
          { name: 'tax', type: 'double', description: 'GST Tax (5%)' },
          { name: 'totalAmount', type: 'double', description: 'Final payable amount' },
          { name: 'status', type: 'OrderStatus', description: 'Current state machine status' },
          { name: 'deliveryAgentId', type: 'String', description: 'Assigned delivery agent ID' },
          { name: 'payment', type: 'Payment', description: 'Associated payment transaction' },
          { name: 'deliveryOtp', type: 'String', description: '4-digit delivery verification OTP' }
        ],
        methods: []
      },
      {
        name: 'DeliveryAgent',
        description: 'Delivery partner with vehicle info, location, and availability state.',
        fields: [
          { name: 'id', type: 'String', description: 'Agent ID' },
          { name: 'name', type: 'String', description: 'Agent name' },
          { name: 'phone', type: 'String', description: 'Contact phone' },
          { name: 'vehicleNumber', type: 'String', description: 'Vehicle registration' },
          { name: 'available', type: 'boolean', description: 'Online/Available flag' },
          { name: 'totalDeliveries', type: 'int', description: 'Completed delivery counter' }
        ],
        methods: [
          { name: 'incrementDeliveries()', returns: 'void', description: 'Increments completed delivery count' }
        ]
      },
      {
        name: 'Payment',
        description: 'Payment transaction record with method, status, and transaction reference.',
        fields: [
          { name: 'id', type: 'String', description: 'Payment ID' },
          { name: 'orderId', type: 'String', description: 'Associated order ID' },
          { name: 'amount', type: 'double', description: 'Transaction amount' },
          { name: 'paymentMethod', type: 'PaymentMethod', description: 'UPI, CREDIT_CARD, DEBIT_CARD, COD, WALLET' },
          { name: 'status', type: 'PaymentStatus', description: 'PENDING, COMPLETED, FAILED, REFUNDED' },
          { name: 'transactionRef', type: 'String', description: 'Bank transaction reference code' }
        ],
        methods: []
      },
      {
        name: 'Notification',
        description: 'Real-time notification record dispatched to stakeholders.',
        fields: [
          { name: 'id', type: 'String', description: 'Notification ID' },
          { name: 'recipientType', type: 'String', description: 'CUSTOMER, RESTAURANT, AGENT' },
          { name: 'recipientId', type: 'String', description: 'Target recipient ID' },
          { name: 'orderId', type: 'String', description: 'Related order ID' },
          { name: 'message', type: 'String', description: 'Notification message body' }
        ],
        methods: []
      }
    ],
    designPatterns: [
      { name: 'Singleton Pattern', used: true, explanation: 'ZomatoService serves as the central singleton service managing all domain operations.' },
      { name: 'State Machine Pattern', used: true, explanation: 'Order state transitions (PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED) enforced with guard conditions.' },
      { name: 'Factory Pattern', used: true, explanation: 'Generates unique IDs, 4-digit OTPs, and payment transaction references.' },
      { name: 'Repository Pattern', used: true, explanation: 'ZomatoRepository abstracts memory storage behind clean CRUD operations.' },
      { name: 'Observer / Notification Pattern', used: true, explanation: 'Dispatches event notification records to Customer, Restaurant, and Agent channels upon state changes.' }
    ],
    principles: [
      { name: 'Single Responsibility Principle (SRP)', description: 'Customer, Restaurant, MenuItem, Order, Payment, and DeliveryAgent each encapsulate distinct domain responsibilities.' },
      { name: 'Open/Closed Principle (OCP)', description: 'New payment methods (e.g. Crypto) or notification channels can be added without altering existing order processing logic.' },
      { name: 'Dependency Inversion Principle (DIP)', description: 'ZomatoService relies on repository abstractions rather than direct memory collections.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Order encapsulates item lists, tax calculations, payment status, and OTP validation logic.' },
      { name: 'Composition', description: 'Order composes OrderItems and a Payment record; Restaurant composes MenuItems.' }
    ],
    extensibility: [
      { area: 'Geospatial Delivery Partner Assignment', description: 'Use Haversine formula to assign the nearest available delivery agent based on restaurant lat/lng coordinates.', difficulty: 'Medium' },
      { area: 'Promo Code & Discount Engine', description: 'Implement a DiscountStrategy interface for percentage off, flat discounts, or free delivery.', difficulty: 'Easy' },
      { area: 'Live GPS Scooter Animation', description: 'Stream real-time scooter coordinates between restaurant and customer address using WebSockets.', difficulty: 'Hard' }
    ]
  },

  elevator: {
    title: 'Elevator Control System — Design Details',
    tldr: [
      'Multi-elevator control system optimizing passenger dispatch across floors',
      'LOOK / SCAN Algorithm for directional elevator movement and request scheduling',
      'State Machine for Elevator states: IDLE, MOVING_UP, MOVING_DOWN, STOPPED_DOOR_OPEN',
      'Thread-safe request handling using ReentrantLock and ConcurrentHashMap'
    ],
    tradeoffs: [
      'Used LOOK algorithm over FCFS to minimize elevator travel distance and wait times.',
      'Scheduled background simulation ticks drive elevator state updates synchronously or on timer.'
    ],
    requirements: [
      'Multi-elevator dispatch across N floors (e.g. 4 elevators, 10 floors)',
      'External floor call buttons (Up / Down)',
      'Internal elevator destination buttons',
      'Optimal elevator selection based on proximity and current direction',
      'Door opening and closing lifecycle transitions'
    ],
    entities: [
      {
        name: 'ElevatorService',
        description: 'Core controller delegating floor requests to optimal elevators.',
        fields: [
          { name: 'elevators', type: 'List<Elevator>', description: 'List of elevator instances' }
        ],
        methods: [
          { name: 'requestElevator(floor, direction)', returns: 'void', description: 'Dispatches optimal elevator to floor request' },
          { name: 'step() / tick()', returns: 'void', description: 'Advances all elevator positions by 1 floor unit' }
        ]
      }
    ],
    designPatterns: [
      { name: 'Strategy Pattern', used: true, explanation: 'Elevator dispatch strategies (Proximity, SCAN algorithm).' },
      { name: 'State Pattern', used: true, explanation: 'Elevator state transitions between IDLE, MOVING, and STOPPED.' }
    ],
    principles: [
      { name: 'Single Responsibility', description: 'Elevator Car handles state/movement; Controller dispatches requests.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Elevator internal floor queues managed via encapsulated methods.' }
    ],
    extensibility: [
      { area: 'Express Elevators', description: 'Add express elevator rules for high-rise buildings.', difficulty: 'Medium' }
    ]
  },

  stackoverflow: {
    title: 'Stack Overflow — Design Details',
    tldr: [
      'Q&A platform with questions, answers, comments, voting, and reputation system',
      'Observer Pattern for notifying question authors on new answers/comments',
      'Thread-safe voting and accept-answer operations'
    ],
    tradeoffs: [
      'In-memory ConcurrentHashMap for questions and answers ensures high read throughput.'
    ],
    requirements: [
      'Post questions with tags and body text',
      'Post answers to questions',
      'Upvote / Downvote questions and answers',
      'Accept correct answer (only by question author)',
      'Search questions by tag or keyword'
    ],
    entities: [
      {
        name: 'StackOverflowService',
        description: 'Main service managing Q&A operations.',
        fields: [],
        methods: [
          { name: 'askQuestion(...)', returns: 'Question', description: 'Creates new question' },
          { name: 'answerQuestion(...)', returns: 'Answer', description: 'Adds answer to question' },
          { name: 'vote(...)', returns: 'void', description: 'Updates vote count on question/answer' }
        ]
      }
    ],
    designPatterns: [
      { name: 'Observer Pattern', used: true, explanation: 'Notifies users on answer posts or votes.' }
    ],
    principles: [
      { name: 'Single Responsibility', description: 'Separate Question, Answer, Comment, and User entities.' }
    ],
    oopConcepts: [
      { name: 'Inheritance / Polymorphism', description: 'Votable interface implemented by Question and Answer.' }
    ],
    extensibility: [
      { area: 'Reputation System', description: 'Add user reputation score calculation rules.', difficulty: 'Easy' }
    ]
  },

  snakeladders: {
    title: 'Snake & Ladders — Design Details',
    tldr: [
      'Turn-based board game with dice rolling, snake slides, ladder climbs, and win detection',
      'Strategy Pattern for dice rolling (Standard 6-sided vs Custom dice)',
      'Queue-based turn management for players'
    ],
    tradeoffs: [
      'Used Map lookup for snake/ladder destination cells for O(1) position calculation.'
    ],
    requirements: [
      '100-cell board with configurable snakes and ladders',
      'Queue of players taking turns',
      'Dice roll generates random integer 1-6',
      'Token moves by roll count; if landing on snake head → slide to tail; if ladder base → climb to top',
      'First player to reach exactly cell 100 wins'
    ],
    entities: [
      {
        name: 'SnakeLaddersService',
        description: 'Game logic controller.',
        fields: [],
        methods: [
          { name: 'rollAndMove(gameId)', returns: 'GameState', description: 'Rolls dice and advances current player' }
        ]
      }
    ],
    designPatterns: [
      { name: 'Strategy Pattern', used: true, explanation: 'Dice strategy abstracts dice rolling logic.' }
    ],
    principles: [
      { name: 'Single Responsibility', description: 'Board manages cell mappings; GameController manages turn flow.' }
    ],
    oopConcepts: [
      { name: 'Composition', description: 'Board composes Snakes, Ladders, and Cells.' }
    ],
    extensibility: [
      { area: 'Multi-dice support', description: 'Support rolling 2 dice simultaneously.', difficulty: 'Easy' }
    ]
  },

  tictactoe: {
    title: 'Tic Tac Toe — Design Details',
    tldr: [
      '2-player 3x3 grid game with turn alternation, win condition checking (rows, cols, diagonals), and draw detection',
      'Strategy Pattern for Win Checking'
    ],
    tradeoffs: [
      'Used O(1) win checking using row, col, and diagonal count arrays.'
    ],
    requirements: [
      '3x3 grid for X and O symbols',
      'Turn alternation between Player 1 and Player 2',
      'Detect win on 3 matching symbols in any row, column, or diagonal',
      'Detect draw when grid is full with no winner'
    ],
    entities: [
      {
        name: 'TicTacToeService',
        description: 'Game engine for Tic Tac Toe.',
        fields: [],
        methods: [
          { name: 'makeMove(gameId, row, col)', returns: 'GameState', description: 'Executes move and checks win/draw condition' }
        ]
      }
    ],
    designPatterns: [
      { name: 'Strategy Pattern', used: true, explanation: 'WinConditionStrategy for verifying winning lines.' }
    ],
    principles: [
      { name: 'Single Responsibility', description: 'Board manages cells; Service manages game rules.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Cell state encapsulated with symbol getters/setters.' }
    ],
    extensibility: [
      { area: 'NxN Grid Support', description: 'Extend board size to N x N with N-in-a-row win condition.', difficulty: 'Easy' }
    ]
  },

  parking: {
    title: 'Parking Lot — Design Details',
    tldr: [
      'Multi-floor parking lot supporting CAR, BIKE, TRUCK with entry/exit gate separation',
      'Strategy Pattern for spot assignment (Nearest vs Farthest) & pricing calculation (Hourly, Flat, Dynamic Surge)',
      'Thread safety via fine-grained ReentrantLocks (spotLock, ticketLock) in ConcurrentHashMap storage',
      'Two-step exit flow: Scan (Preview Price) -> Pay & Exit (Release Spot & Issue Receipt)'
    ],
    tradeoffs: [
      'Used Strategy Pattern + Factory over inline conditionals to adhere to Open-Closed Principle for future vehicle types and pricing rules.',
      'Chosen fine-grained ReentrantLock over synchronized methods to reduce thread contention across different floors and spots.',
      'In-memory ConcurrentHashMap eliminates DB overhead for lightning-fast sub-millisecond spot allocation.'
    ],
    requirements: [
      'Multi-floor parking lot with 3 types of spots: CAR (12), BIKE (12), TRUCK (6) — 30 spots total across 3 floors',
      'Multiple gates: G1/G2 (Entry), G3/G4 (Exit) — vehicles can only enter through entry gates and exit through exit gates',
      'Vehicle entry: driver enters through an entry gate → selects spot strategy (Nearest / Farthest) → system assigns spot and issues ticket',
      'Multi-step Vehicle exit: Step 1: Scan ticket & calculate price preview (UNPAID, spot retained) → Step 2: Select payment method (UPI, CARD, CASH) & pay → ticket marked PAID & spot released',
      'Extensible Pricing Strategies: HourlyPricingStrategy (CAR ₹20/hr, BIKE ₹10/hr, TRUCK ₹40/hr), FlatRatePricingStrategy (Flat rates), DynamicPricingStrategy (1.5x surge rate)',
      'Extensible Spot Assignment Strategies: NearestSpotStrategy (lowest floor & spot ID) vs FarthestSpotStrategy (highest floor & spot ID)',
      'Real-time spot availability tracking via concurrent-safe data structures',
      'Thread-safe concurrent access — fine-grained ReentrantLock (spotLock and ticketLock) ensures zero race conditions or double bookings',
    ],
    entities: [
      {
        name: 'ParkingLotService',
        description: 'Core business logic layer. Handles entry (assign spot + create ticket) and multi-step exit (scan preview + process payment & release spot). Uses Strategy Factories for spot allocation & pricing.',
        fields: [
          { name: 'repository', type: 'ParkingLotRepository', description: 'Data access layer injected via Spring @Autowired' },
          { name: 'spotStrategyFactory', type: 'SpotAssignmentStrategyFactory', description: 'Factory resolving spot assignment strategy ("NEAREST", "FARTHEST")' },
          { name: 'pricingStrategyFactory', type: 'PricingStrategyFactory', description: 'Factory resolving pricing strategy ("HOURLY", "FLAT", "DYNAMIC")' },
        ],
        methods: [
          { name: 'entry(dto)', returns: 'Ticket', description: 'Validates gate → finds spot via selected SpotAssignmentStrategy → generates ticket → saves' },
          { name: 'scanTicket(gateId, ticketNumber, pricingStrategyName)', returns: 'Ticket', description: 'Validates exit gate & ticket → computes preview charge (UNPAID) without releasing spot' },
          { name: 'payAndExit(gateId, ticketNumber, pricingStrategyName, paymentMethod)', returns: 'Ticket', description: 'Validates exit gate & ticket → calculates final charge → sets PAID & paymentMethod → releases spot' },
          { name: 'getGates()', returns: 'List<Gate>', description: 'Returns all configured gates' },
          { name: 'getFloors()', returns: 'List<Floor>', description: 'Returns all floors with their spots' },
          { name: 'getActiveTickets()', returns: 'List<Ticket>', description: 'Returns all tickets with no exit time' },
        ],
      },
      {
        name: 'SpotAssignmentStrategyFactory',
        description: 'Factory registry for spot assignment strategies. Resolves strategy instances dynamically based on strategy name ("NEAREST" vs "FARTHEST").',
        fields: [
          { name: 'strategies', type: 'Map<String, SpotAssignmentStrategy>', description: 'Map of strategy implementations keyed by uppercase name' },
        ],
        methods: [
          { name: 'getStrategy(strategyName)', returns: 'SpotAssignmentStrategy', description: 'Returns requested strategy implementation, defaulting to NEAREST if omitted' },
        ],
      },
      {
        name: 'PricingStrategyFactory',
        description: 'Factory registry for ticket pricing strategies. Resolves pricing strategy instances dynamically based on strategy name ("HOURLY", "FLAT", "DYNAMIC").',
        fields: [
          { name: 'strategies', type: 'Map<String, PricingStrategy>', description: 'Map of pricing strategy implementations keyed by uppercase name' },
        ],
        methods: [
          { name: 'getStrategy(strategyName)', returns: 'PricingStrategy', description: 'Returns requested pricing strategy implementation, defaulting to HOURLY if omitted' },
        ],
      },
      {
        name: 'ParkingLotRepository',
        description: 'In-memory data store using ConcurrentHashMap and fine-grained ReentrantLocks for thread safety. Single source of truth for all parking lot state.',
        fields: [
          { name: 'floors', type: 'Map<String, Floor>', description: 'LinkedHashMap — preserves insertion order of floors' },
          { name: 'spots', type: 'ConcurrentHashMap<String, ParkingSpot>', description: 'All spots indexed by ID for O(1) lookup' },
          { name: 'tickets', type: 'ConcurrentHashMap<String, Ticket>', description: 'All tickets indexed by ticket number' },
          { name: 'gates', type: 'Map<String, Gate>', description: 'All gates indexed by gate ID' },
          { name: 'spotLock', type: 'ReentrantLock', description: 'Ensures atomic spot occupy/release operations without contention' },
          { name: 'ticketLock', type: 'ReentrantLock', description: 'Ensures unique atomic ticket number generation' },
        ],
        methods: [
          { name: 'occupySpot(vehicleType, strategy)', returns: 'ParkingSpot', description: 'Finds & marks available spot of given type using strategy — thread safe via spotLock' },
          { name: 'releaseSpot(spotId)', returns: 'void', description: 'Marks spot as available — thread safe via spotLock' },
          { name: 'generateTicketNumber()', returns: 'String', description: 'Atomic counter — produces "TKT-00001" format via ticketLock' },
          { name: 'getActiveTickets()', returns: 'List<Ticket>', description: 'Filters tickets where exitTime == null, sorted newest first' },
        ],
      },
      {
        name: 'Ticket',
        description: 'Value object representing a parking session. Created on entry, previewed on scan, finalized on payment & exit.',
        fields: [
          { name: 'ticketNumber', type: 'String', description: 'Unique identifier (auto-generated), e.g. TKT-00001' },
          { name: 'vehicleNumber', type: 'String', description: 'License plate of the vehicle, e.g. KA-01-AB-1234' },
          { name: 'vehicleType', type: 'VehicleType', description: 'CAR, BIKE, or TRUCK — determines spot & base rate' },
          { name: 'spotId', type: 'String', description: 'Assigned parking spot ID, e.g. F1-C2' },
          { name: 'entryTime', type: 'LocalDateTime', description: 'Timestamp when vehicle entered' },
          { name: 'exitTime', type: 'LocalDateTime', description: 'Timestamp when vehicle exited (null while active)' },
          { name: 'amount', type: 'double', description: 'Calculated charge (0.0 while active, calculated via PricingStrategy)' },
          { name: 'paymentStatus', type: 'PaymentStatus', description: 'UNPAID on scan preview, PAID on exit payment' },
          { name: 'paymentMethod', type: 'String', description: 'UPI, CARD, or CASH — recorded on payment' },
        ],
        methods: [],
      },
      {
        name: 'ParkingSpot',
        description: 'Represents a single parking spot with Lombok annotations (@Getter, @Setter).',
        fields: [
          { name: 'id', type: 'String', description: 'Format: F{floor}-{type}{number}, e.g. F1-C2' },
          { name: 'floorNumber', type: 'int', description: 'Floor level (1-3)' },
          { name: 'spotNumber', type: 'int', description: 'Sequential number within vehicle type on that floor' },
          { name: 'vehicleType', type: 'VehicleType', description: 'Supported vehicle category (CAR/BIKE/TRUCK)' },
          { name: 'occupied', type: 'boolean', description: 'Occupancy status' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Strategy Pattern',
        used: true,
        explanation: 'Fully implemented Strategy pattern for both Parking Spot Assignment (NearestSpotStrategy, FarthestSpotStrategy) and Ticket Pricing (HourlyPricingStrategy, FlatRatePricingStrategy, DynamicPricingStrategy). Strategies are selected dynamically at runtime without modifying service code (Open/Closed Principle).',
      },
      {
        name: 'Factory Pattern',
        used: true,
        explanation: 'SpotAssignmentStrategyFactory and PricingStrategyFactory encapsulate creation and lookup of strategy implementations based on request parameters.',
      },
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'ParkingLotRepository abstracts data access and concurrency locking away from the service layer, keeping business logic clean and testable.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service, @Repository, and Strategy Factories operate as singletons to maintain a single consistent state across all requests.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'Services receive repository and strategy factories via Spring @Autowired constructor injection, maximizing decoupling and testability.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'Each class has exactly one reason to change. ParkingLotService handles business logic (entry/exit rules, pricing). ParkingLotRepository handles data storage and retrieval. ParkingLotController handles HTTP mapping. Changes to pricing don\'t affect data storage, and vice versa.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new vehicle type requires only adding an enum constant and updating the switch statement — no structural changes. The system is open for extension (new types, new pricing) but closed for modification of core entry/exit flow. The Repository Pattern also allows swapping storage without modifying the service.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'High-level ParkingLotService depends on the ParkingLotRepository abstraction, not on concrete storage details. Spring injects the concrete repository at runtime. This allows switching from in-memory to database storage by implementing the same repository interface without changing business logic.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Gate validation logic is centralized in the service (getGate() + type check), not duplicated per endpoint. Spot occupancy logic is in repository.ocurrentSpot() and releaseSpot(), not scattered. Pricing rates are constants in one place, not magic numbers.',
      },
      {
        name: 'Encapsulation',
        description: 'All fields are private with getter/setter methods. The repository\'s internal maps are never exposed directly — only queried through controlled methods. The ticket\'s amount is only set by the service during exit, not mutable by external code.',
      },
    ],
    oopConcepts: [
      {
        name: 'Polymorphism — Enum-based Type Dispatch',
        description: 'VehicleType enum (CAR/BIKE/TRUCK) drives both spot selection (which spots to search) and pricing (which rate to apply). The same code path handles all types via the enum value, without if-else chains.',
        alternative: 'Could use class hierarchy (Car extends Vehicle, Bike extends Vehicle) with getRate() method. Enum is chosen because vehicle types are fixed, finite, and don\'t have behavioral differences beyond rate/spot mapping. Enums are simpler, immutable, and switch-friendly.',
      },
      {
        name: 'Encapsulation — Data Hiding',
        description: 'Every class hides its internal state. ParkingLotRepository wraps ConcurrentHashMap behind semantic methods. ParkingSpot encapsulates occupancy with a setter that can add validation. Ticket prevents direct amount mutation from outside the service.',
        alternative: 'Could use public fields for simplicity (like a C struct). Encapsulation is chosen because it provides a controlled interface — the repository can add locks, validation, or logging without changing callers.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Floor contains a List of ParkingSpot (composition), not extends SpotCollection. ParkingLotRepository doesn\'t extend a base repository — it composes maps. Services delegate to repositories rather than inheriting data access.',
        alternative: 'Could use inheritance (Floor extends SpotCollection). Composition is chosen because it\'s more flexible — Floors can change their spot collection strategy (array, list, map) without changing the Floor class hierarchy.',
      },
      {
        name: 'Immutable Objects (Value Objects)',
        description: 'Ticket, Gate, Floor, and ParkingSpot are primarily value objects with most fields set at construction and only specific fields mutable (occupied, exitTime, amount). This reduces unexpected state changes.',
        alternative: 'Could make all fields mutable with setters. Limited mutability is chosen because it makes the data flow explicit — you can trace exactly where state changes happen (service.entry, service.exit) rather than mutations being scattered across code.',
      },
    ],
    extensibility: [
      {
        area: 'New Vehicle Types',
        description: 'Add a new constant to VehicleType enum, define spot count in ParkingLotInitializer, add rate constant in ParkingLotService, and add a new field in the frontend EntryForm vehicle type selector.',
        difficulty: 'Easy',
      },
      {
        area: 'Dynamic Pricing',
        description: 'Replace the switch statement with a PricingStrategy interface. Implementations: HourlyStrategy (current), DailyStrategy, WeekendStrategy, SurgeStrategy. The service delegates pricing to the strategy, making it trivial to add new pricing models.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement a JpaParkingLotRepository that implements the same interface as ParkingLotRepository. Swap via Spring @Profile or @Primary. No changes needed in the service layer due to Dependency Injection.',
        difficulty: 'Medium',
      },
      {
        area: 'Reservation System',
        description: 'Add Reservation entity with time slot, add reserve() method to service. On entry, check for reservation instead of assigning any spot. Extends the existing flow without breaking entry/exit.',
        difficulty: 'Medium',
      },
      {
        area: 'Payment Gateway',
        description: 'Add PaymentService interface (Razorpay, Stripe, etc.). Call payment.process(amount) during exit before releasing the spot. The existing amount calculation remains unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'VIP / Reserved Spots',
        description: 'Add an isReserved flag to ParkingSpot. Modify occupySpot() to prefer unreserved spots first. Add reserveSpot() method. Frontend shows reserved spots differently.',
        difficulty: 'Easy',
      },
      {
        area: 'Analytics Dashboard',
        description: 'Add ParkingLotAnalyticsService that uses the existing repository methods to compute: peak hours, revenue reports, occupancy trends, average stay duration. No changes to core entry/exit flow.',
        difficulty: 'Medium',
      },
      {
        area: 'Multiple Parking Lots',
        description: 'Add ParkingLot entity with its own floors/spots/gates. Modify service to take parkingLotId parameter. Repository becomes a multi-lot store. Frontend adds lot selector.',
        difficulty: 'Hard',
      },
    ],
  },

  library: {
    title: 'Library — Design Details',
    requirements: [
      'Library management system with books, members, and borrow records',
      'Books have states: AVAILABLE, BORROWED, RESERVED — only available books can be borrowed',
      'Members can search books by title, author, or ISBN',
      'Borrowing a book creates a BorrowRecord with borrow date and due date (14 days)',
      'Returning a book checks for overdue — fine is ₹5/day past due date',
      'Members can view their borrowing history with fines',
      'Thread-safe concurrent access — multiple members can borrow/return simultaneously',
    ],
    entities: [
      {
        name: 'LibraryService',
        description: 'Core business logic layer. Handles book search, borrow, return, and member history. Enforces business rules: book must be AVAILABLE to borrow, calculates fines on overdue returns.',
        fields: [
          { name: 'repository', type: 'LibraryRepository', description: 'Data access layer injected via constructor' },
          { name: 'FINE_PER_DAY', type: 'double', value: '5.0', description: 'Fine charged per day overdue' },
          { name: 'BORROW_DAYS', type: 'int', value: '14', description: 'Standard borrowing period in days' },
        ],
        methods: [
          { name: 'searchBooks(q)', returns: 'List<Book>', description: 'Search books by title, author, or ISBN (case-insensitive)' },
          { name: 'borrowBook(memberId, bookId)', returns: 'BorrowRecord', description: 'Validates availability → creates record with 14-day due date → marks book BORROWED' },
          { name: 'returnBook(recordId)', returns: 'BorrowRecord', description: 'Marks return date → calculates fine if overdue → marks book AVAILABLE' },
          { name: 'getMemberHistory(memberId)', returns: 'List<BorrowRecord>', description: 'Returns all borrow records for a member, sorted newest first' },
        ],
      },
      {
        name: 'LibraryRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'books', type: 'ConcurrentHashMap<Long, Book>', description: 'All books indexed by ID' },
          { name: 'members', type: 'ConcurrentHashMap<Long, Member>', description: 'All members indexed by ID' },
          { name: 'borrowRecords', type: 'ConcurrentHashMap<Long, BorrowRecord>', description: 'All borrow records indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'searchBooks(q)', returns: 'List<Book>', description: 'Stream-filter search across title, author, ISBN' },
          { name: 'saveBorrowRecord(record)', returns: 'BorrowRecord', description: 'Thread-safe insert into borrowRecords map' },
          { name: 'getMemberHistory(memberId)', returns: 'List<BorrowRecord>', description: 'Filters and sorts records by member' },
        ],
      },
      {
        name: 'Book',
        description: 'Value object representing a library book with its current availability status.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'title', type: 'String', description: 'Book title' },
          { name: 'author', type: 'String', description: 'Book author' },
          { name: 'isbn', type: 'String', description: 'International Standard Book Number' },
          { name: 'status', type: 'String', description: 'AVAILABLE, BORROWED, or RESERVED' },
        ],
        methods: [],
      },
      {
        name: 'Member',
        description: 'Library member with contact info and membership date.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'name', type: 'String', description: 'Member full name' },
          { name: 'email', type: 'String', description: 'Member email address' },
          { name: 'membershipDate', type: 'LocalDate', description: 'When the member joined' },
        ],
        methods: [],
      },
      {
        name: 'BorrowRecord',
        description: 'Tracks a book borrowing session from borrow through return, including any fines.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'bookId', type: 'long', description: 'Which book was borrowed' },
          { name: 'memberId', type: 'long', description: 'Which member borrowed it' },
          { name: 'borrowDate', type: 'LocalDate', description: 'Date the book was checked out' },
          { name: 'dueDate', type: 'LocalDate', description: 'Expected return date (borrow + 14 days)' },
          { name: 'returnDate', type: 'LocalDate', description: 'Actual return date (null while active)' },
          { name: 'fine', type: 'double', description: 'Calculated fine (₹5/day overdue, 0 if on time)' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'LibraryRepository abstracts data access behind semantic methods like searchBooks() and saveBorrowRecord(). The service never touches maps directly — it calls named operations. This keeps business logic clean and enables testing with mock repositories.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring one consistent state across all requests. Critical since all data lives in memory and must be shared across concurrent users.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'LibraryService receives LibraryRepository via constructor injection. Spring auto-wires the dependency, making the service testable without Spring container and allowing repository swaps.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Fine calculation is currently a simple formula (daysOverdue × FINE_PER_DAY). A FineCalculationStrategy interface could support different policies: NoFineForStudents, CapMaxFine, etc.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'LibraryService handles borrowing rules and fine calculation. LibraryRepository manages data persistence. LibraryController maps HTTP requests. Each has one reason to change.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new book status (LOST, DAMAGED) requires no structural changes. New search criteria can be added without modifying existing filters. The system is open for extension, closed for modification of core borrow/return flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not concrete storage. Spring injects the implementation. Switching from in-memory to JPA requires only a new repository implementation.',
      },
      {
        name: 'DRY',
        description: 'Book status validation is centralized in borrowBook() and returnBook(). Search logic is in one stream pipeline. Fine formula is in one place, not duplicated.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation',
        description: 'Book status is only changed through service methods (borrowBook marks BORROWED, returnBook marks AVAILABLE). External code cannot directly mutate book state.',
        alternative: 'Could use public setters. Controlled mutation via service is chosen because it enforces business rules (can only borrow available books).',
      },
      {
        name: 'Association',
        description: 'BorrowRecord associates Book with Member through bookId and memberId fields. This links the two entities without tight coupling.',
        alternative: 'Could use direct object references (Book book field). Using IDs is chosen because it avoids circular references and simplifies serialization.',
      },
    ],
    extensibility: [
      {
        area: 'Book Reservations',
        description: 'Add a reservation queue. When a BORROWED book is returned, the next member in queue gets notified. Add Reservation entity + holdBook() and releaseHold() methods.',
        difficulty: 'Medium',
      },
      {
        area: 'Different Fine Policies',
        description: 'Implement FineStrategy interface with StandardFine, StudentFine, MaxCapFine. Inject into LibraryService. No changes to borrow/return flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Create JpaLibraryRepository implementing the same interface. Swap via @Profile or @Primary. No service changes needed.',
        difficulty: 'Medium',
      },
      {
        area: 'Book Categories/Tags',
        description: 'Add categories and tags to Book. Add filtering by category in search. Extend existing search infrastructure.',
        difficulty: 'Easy',
      },
      {
        area: 'Late Notifications',
        description: 'Add NotificationService (Email, SMS). Call sendOverdueNotice(member) during returnBook() or via a scheduled job that scans for overdue books.',
        difficulty: 'Medium',
      },
    ],
  },

  movieticket: {
    title: 'Movie Ticket Booking — Design Details',
    requirements: [
      'Movie ticket booking system with movies, shows, seats, and bookings',
      'Multiple movies each with multiple shows across different screens and time slots',
      'Seats are categorized as Gold (₹350, rows 1-2) or Silver (₹200, rows 3-4)',
      'Users can browse movies, view show timings, and see seat availability',
      'Booking seats marks them as unavailable and updates available seat count',
      'Cancellation restores seat availability and updates show counts',
      'Thread-safe concurrent access — multiple users can book simultaneously without double-booking',
    ],
    entities: [
      {
        name: 'MovieTicketService',
        description: 'Core business logic for movie browsing and seat booking. Handles seat selection, booking creation, and cancellation with thread-safe operations.',
        fields: [
          { name: 'repository', type: 'MovieTicketRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic booking and cancellation operations' },
        ],
        methods: [
          { name: 'getMovies()', returns: 'List<Movie>', description: 'Returns all movies in the system' },
          { name: 'getShows(movieId)', returns: 'List<Show>', description: 'Returns all shows for a given movie' },
          { name: 'getSeats(showId)', returns: 'List<Seat>', description: 'Returns all seats for a show with availability' },
          { name: 'bookSeats(showId, seatIds, userId)', returns: 'Booking', description: 'Validates and books selected seats — thread safe' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking, restores seats and show availability' },
        ],
      },
      {
        name: 'MovieTicketRepository',
        description: 'In-memory data store with ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'movies', type: 'ConcurrentHashMap<Long, Movie>', description: 'All movies indexed by ID' },
          { name: 'shows', type: 'ConcurrentHashMap<Long, Show>', description: 'All shows indexed by ID' },
          { name: 'seats', type: 'ConcurrentHashMap<Long, Seat>', description: 'All seats indexed by ID' },
          { name: 'bookings', type: 'ConcurrentHashMap<Long, Booking>', description: 'All bookings indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'getMovies()', returns: 'List<Movie>', description: 'Returns all movies' },
          { name: 'getShowsByMovie(movieId)', returns: 'List<Show>', description: 'Filters shows by movie' },
          { name: 'saveBooking(booking)', returns: 'Booking', description: 'Thread-safe booking save' },
        ],
      },
      {
        name: 'Movie',
        description: 'Represents a movie with metadata.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'title', type: 'String', description: 'Movie title' },
          { name: 'genre', type: 'String', description: 'Genre (Sci-Fi, Action, etc.)' },
          { name: 'duration', type: 'int', description: 'Duration in minutes' },
          { name: 'rating', type: 'double', description: 'IMDB-style rating out of 10' },
        ],
        methods: [],
      },
      {
        name: 'Show',
        description: 'A specific screening of a movie at a given time and screen.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'movieId', type: 'long', description: 'Which movie is playing' },
          { name: 'screen', type: 'String', description: 'Screen name (Screen 1, Screen 2, etc.)' },
          { name: 'showTime', type: 'String', description: 'Time of show (10:00 AM, 2:00 PM, etc.)' },
          { name: 'availableSeats', type: 'int', description: 'Currently available seats (decremented on booking)' },
          { name: 'totalSeats', type: 'int', description: 'Total seats (24 per show: 4 rows × 6 cols)' },
        ],
        methods: [],
      },
      {
        name: 'Seat',
        description: 'A single seat in the cinema with type and pricing.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'row', type: 'int', description: 'Row number (1-4)' },
          { name: 'col', type: 'int', description: 'Column number (1-6)' },
          { name: 'type', type: 'String', description: 'Gold (rows 1-2) or Silver (rows 3-4)' },
          { name: 'price', type: 'double', description: 'Gold: ₹350, Silver: ₹200' },
          { name: 'available', type: 'boolean', description: 'Whether the seat is free to book' },
        ],
        methods: [],
      },
      {
        name: 'Booking',
        description: 'A confirmed seat booking with payment details.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier' },
          { name: 'showId', type: 'long', description: 'Which show this booking is for' },
          { name: 'seatIds', type: 'List<Long>', description: 'List of booked seat IDs' },
          { name: 'userId', type: 'String', description: 'Who made the booking' },
          { name: 'status', type: 'String', description: 'BOOKED or CANCELLED' },
          { name: 'totalAmount', type: 'double', description: 'Sum of all booked seat prices' },
          { name: 'bookingTime', type: 'LocalDateTime', description: 'When the booking was made' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'MovieTicketRepository encapsulates all data access. The service calls updateSeat(), saveBooking(), etc. rather than directly manipulating maps. This separates persistence concerns from business logic.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure consistent state across concurrent requests. Critical for preventing double-booking in an in-memory system.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'MovieTicketService receives MovieTicketRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'The bookSeats() method wraps all operations (validate seats → mark unavailable → update show → create booking) in a single ReentrantLock block, ensuring atomicity. If any step fails, no partial state is committed.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'MovieTicketService handles booking business logic (seat validation, pricing). Repository manages all data storage. Controller handles HTTP concerns. Each has a clear, single responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new seat tier (e.g., VIP ₹500) requires only adding the seat type and price — no service changes. New cancellation policies can be added without modifying core booking flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction. Spring injects the concrete implementation. Switching storage (e.g., to Redis) requires only a new repository.',
      },
      {
        name: 'Fail-Fast Validation',
        description: 'Booking validates all seats before marking any as unavailable. If seat #3 is already booked, the entire operation fails before any state change, preventing partial bookings.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation',
        description: 'Seat.available is only modified through service.bookSeats() and cancelBooking(). External code cannot accidentally mark seats available or unavailable.',
        alternative: 'Could expose public setters. Controlled mutation via service prevents double-booking bugs.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Booking contains a list of Seat IDs (composition). Show does not extend Movie — it references a movieId. This avoids deep inheritance hierarchies.',
        alternative: 'Could extend Movie class with Show inheriting. Composition is chosen because a Show is not a type of Movie — it represents a screening event.',
      },
    ],
    extensibility: [
      {
        area: 'Multiple Theaters',
        description: 'Add Theater entity containing screens and shows. Each Theater has its own seat layout. MovieTicketService takes theaterId parameter.',
        difficulty: 'Medium',
      },
      {
        area: 'Food & Beverage Addon',
        description: 'Add FnbItem and FnbOrder entities. Extend Booking with optional food items. Calculate additional amount during booking.',
        difficulty: 'Medium',
      },
      {
        area: 'Loyalty Program',
        description: 'Add User entity with loyalty points. Points earned per booking (₹1 = 1 point). Redeem points for discounts on future bookings.',
        difficulty: 'Easy',
      },
      {
        area: 'Dynamic Seat Pricing',
        description: 'Replace fixed pricing with a PricingStrategy. Peak hours (evening shows) cost more. Weekends have premium pricing.',
        difficulty: 'Medium',
      },
{
        area: 'Multiple Parking Lots',
        description: 'Add ParkingLot entity with its own floors/spots/gates. Modify service to take parkingLotId parameter. Repository becomes a multi-lot store. Frontend adds lot selector.',
        difficulty: 'Hard',
      },
    ],
  },

  chess: {
    title: 'Chess — Design Details',
    requirements: [
      'Two-player chess game with standard 8×8 board and initial piece setup',
      'Full move validation for all piece types: Pawn, Rook, Knight, Bishop, Queen, King',
      'Pawn: moves forward 1 (2 from start), captures diagonally',
      'Rook: horizontal/vertical moves through empty squares',
      'Knight: L-shaped jumps (2+1), ignores pieces in between',
      'Bishop: diagonal moves through empty squares',
      'Queen: combination of rook + bishop moves',
      'King: 1 step any direction, with castling support',
      'Check detection: a king is under attack by an opponent piece',
      'Checkmate detection: in check and no legal move to escape',
      'Stalemate detection: not in check but no legal move available',
      'Cannot make a move that leaves own king in check',
      'Turn-based: White moves first, then alternating',
      'Castling: king moves 2 squares toward rook, rook jumps over',
      'Thread-safe concurrent game state via ReentrantLock',
    ],
    entities: [
      {
        name: 'ChessService',
        description: 'Core chess engine with full move validation, check/checkmate/stalemate detection, and castling support. All game mutations are protected by ReentrantLock.',
        fields: [
          { name: 'repository', type: 'ChessRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe game state mutations' },
        ],
        methods: [
          { name: 'createGame(playerWhite, playerBlack)', returns: 'Game', description: 'Creates new game with initial board setup and two players' },
          { name: 'makeMove(gameId, fromRow, fromCol, toRow, toCol)', returns: 'Game', description: 'Validates and executes a move, detects check/checkmate/stalemate' },
          { name: 'getValidMoves(gameId, row, col)', returns: 'List<int[]>', description: 'Returns all legal destination squares for a piece at given position' },
          { name: 'getGame(gameId)', returns: 'Game', description: 'Returns current game state including board, players, status, and move history' },
        ],
      },
      {
        name: 'Game',
        description: 'Central entity holding all chess game state including the 8×8 board, player info, turn tracking, status, and complete move history.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique game identifier' },
          { name: 'board', type: 'String[8][8]', description: '2D array: piece codes like "wK", "bP", null for empty' },
          { name: 'players', type: 'Player[2]', description: 'Array of two players (White at index 0, Black at index 1)' },
          { name: 'currentPlayerIndex', type: 'int', description: '0 for White, 1 for Black' },
          { name: 'status', type: 'GameStatus', description: 'ACTIVE, CHECK, CHECKMATE, DRAW, STALEMATE, or RESIGNED' },
          { name: 'winner', type: 'String', description: 'Winner name when status is CHECKMATE' },
          { name: 'moveHistory', type: 'List<Move>', description: 'Chronological list of all moves played' },
        ],
        methods: [],
      },
      {
        name: 'Move Validation',
        description: 'Each piece type has specific move validation logic with check-safety post-filtering.',
        fields: [
          { name: 'isValidPawnMove', type: 'method', description: 'Forward 1/2, diagonal capture, no en passant (simplified)' },
          { name: 'isValidRookMove', type: 'method', description: 'Horizontal/vertical until blocked' },
          { name: 'isValidKnightMove', type: 'method', description: '2+1 L-shape, jumps over pieces' },
          { name: 'isValidBishopMove', type: 'method', description: 'Diagonal until blocked' },
          { name: 'isValidQueenMove', type: 'method', description: 'Combination of rook + bishop' },
          { name: 'isValidKingMove', type: 'method', description: '1 step any direction + castling' },
        ],
        methods: [
          { name: 'isInCheckOnBoard(board, color)', returns: 'boolean', description: 'Scans all enemy pieces to see if they attack the king\'s square' },
          { name: 'isSquareAttacked(board, row, col, color)', returns: 'boolean', description: 'Checks if any enemy piece can move to given square' },
          { name: 'isCheckmate(game, color)', returns: 'boolean', description: 'In check + no legal move exists' },
          { name: 'hasLegalMove(game, color)', returns: 'boolean', description: 'Brute-force search: tries every piece on every destination' },
        ],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'ChessRepository abstracts all data access. The service never touches the ConcurrentHashMap directly — it calls semantic methods like save() and get(). This makes the service testable and the data layer swappable.',
      },
      {
        name: 'Singleton Pattern (Spring)',
        used: true,
        explanation: 'All @Service and @Repository beans are Spring singletons. This ensures all HTTP requests share the same in-memory game state, which is essential since there is no database.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'ChessService receives ChessRepository via constructor injection. This decouples creation from usage and enables unit testing with mock repositories.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Currently move validation uses switch/if-else per piece type. A MoveValidator interface with per-piece implementations (PawnValidator, RookValidator, etc.) would better follow Open/Closed and make adding new piece types easier.',
      },
      {
        name: 'Memento Pattern',
        used: false,
        explanation: 'Move history is stored but not used for undo. A proper Memento pattern would allow undoing moves by saving full board snapshots before each move, enabling takeback functionality for casual play.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'ChessService handles business logic (move validation, check detection). ChessRepository handles data storage. Game encapsulates board state. Each class has one clear purpose.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new piece type requires only adding a case in switch statements and implementing its move validation. The core game flow (select piece → validate → execute → check state) remains unchanged.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'ChessService depends on the ChessRepository abstraction, not on ConcurrentHashMap directly. This allows swapping storage strategy (HashMap → DB) without changing service logic.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Board cloning logic is a single cloneBoard() method. Check detection is centralized in isInCheckOnBoard(). Square attack checking is one method reused by all pieces.',
      },
      {
        name: 'Encapsulation',
        description: 'Game board is mutated only through service.makeMove(). The repository\'s internal map is never exposed directly. All model fields are private with getters/setters.',
      },
    ],
    oopConcepts: [
      {
        name: 'Polymorphism — Piece-based Dispatch',
        description: 'Move validation dispatches to piece-specific logic based on the piece type character (K, Q, R, B, N, P). The same makeMove() code path handles all pieces via type dispatch.',
        alternative: 'Could use a Piece interface with an isValidMove() method and concrete classes for each piece type. Switch dispatch is simpler for a fixed set of 6 piece types and avoids class explosion.',
      },
      {
        name: 'Encapsulation — Board State Protection',
        description: 'The board array is never directly exposed for mutation — all changes go through makeMove() which validates, simulates, and checks for check-safety before committing.',
        alternative: 'Could expose board directly for speed. Encapsulation is chosen because it prevents invalid states and makes the mutation path auditable via move history.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Game contains arrays of Players and Moves (composition). Pieces are represented as strings, not a class hierarchy. This keeps the model simple and avoids deep inheritance trees.',
        alternative: 'Could use Piece abstract class with King, Queen, etc. subclasses. String-based pieces are chosen because they are serializable, compact, and avoid class loading overhead for 32 pieces.',
      },
      {
        name: 'Value Objects — Move Records',
        description: 'Each Move is an immutable-ish record of what happened: from/to coordinates, piece moved, piece captured, special flags. This makes the move history self-documenting.',
        alternative: 'Could store moves as simple strings like "e2e4". Structured Move objects are chosen because they support flags (castling, en passant) and are easier to parse on the frontend.',
      },
    ],
    extensibility: [
      {
        area: 'New Piece Types (e.g., Chancellor, Archbishop)',
        description: 'Add piece type to PieceType enum, add validation case in isValidMove() and isSquareAttacked(), add Unicode symbol. Core game flow unchanged.',
        difficulty: 'Easy',
      },
      {
        area: 'En Passant Capture',
        description: 'Track the last pawn double-move in Game state. In pawn validation, check if the target is the en passant square. Remove the captured pawn. Adds ~20 lines.',
        difficulty: 'Medium',
      },
      {
        area: 'Pawn Promotion',
        description: 'When a pawn reaches the last rank, present a choice dialog on the frontend. Backend accepts a promotion piece parameter in makeMove().',
        difficulty: 'Medium',
      },
      {
        area: 'Undo Move',
        description: 'Store board snapshots (Memento pattern) before each move. Add undoMove() that restores the previous snapshot and reverts to the previous player\'s turn.',
        difficulty: 'Medium',
      },
      {
        area: 'AI Opponent (Minimax)',
        description: 'Add ChessAI service with minimax evaluation. Frontend shows AI move option. AI calls makeMove() with the computed best move. No changes to validation logic.',
        difficulty: 'Hard',
      },
      {
        area: 'Game Timer / Clock',
        description: 'Add timestamps to moves. Frontend shows elapsed time per player. Service enforces time control (e.g., 10 min per player). Flags timeout as a loss.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaChessRepository implementing the same interface as ChessRepository. Swap via Spring profile. No service layer changes needed.',
        difficulty: 'Medium',
      },
    ],
  },

  ludo: {
    title: 'Ludo — Design Details',
    requirements: [
      'Four-player Ludo game with colored tokens: RED, GREEN, BLUE, YELLOW',
      'Each player has 4 tokens starting in their home base (position -1)',
      '52-cell circular track (positions 0-51) with 4 entry points at 0, 13, 26, 39',
      'Roll dice (1-6) to move: need a 6 to bring a token out of home',
      'Rolling a 6 grants an extra turn',
      'Captures: landing on an opponent token sends it back home',
      'Safe spots (8 total): opponents cannot capture tokens on safe positions',
      'Token cannot move to a square occupied by another own token',
      'Turn alternates between players; first to get all 4 tokens to the final cell wins',
      'Near win condition: token reaching the final cell before its starting position is marked finished',
      'Thread-safe game state via ReentrantLock',
    ],
    entities: [
      {
        name: 'LudoService',
        description: 'Core game logic for Ludo. Handles dice rolling, token movement, captures, turn management, and win detection. All state mutations are protected by ReentrantLock.',
        fields: [
          { name: 'repository', type: 'LudoRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe game state mutations' },
          { name: 'random', type: 'Random', description: 'Random number generator for dice rolls' },
        ],
        methods: [
          { name: 'createGame(playerNames)', returns: 'Game', description: 'Creates new game with 4 players, 4 tokens each at home' },
          { name: 'rollDice(gameId)', returns: 'Game', description: 'Rolls dice (1-6), auto-advances if only one move available' },
          { name: 'moveToken(gameId, playerIndex, tokenIndex)', returns: 'Game', description: 'Moves selected token by current dice value, handles captures' },
          { name: 'getGame(gameId)', returns: 'Game', description: 'Returns current game state' },
        ],
      },
      {
        name: 'Game',
        description: 'Holds all game state: players, their tokens, current turn, dice value, and win status.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique game identifier' },
          { name: 'players', type: 'List<Player>', description: '4 players with name and color' },
          { name: 'tokens', type: 'List<List<Token>>', description: '4×4 grid: 4 tokens per player' },
          { name: 'currentPlayerIndex', type: 'int', description: 'Whose turn it is (0-3)' },
          { name: 'diceValue', type: 'int', description: 'Last rolled dice value (0 = not rolled)' },
          { name: 'status', type: 'GameStatus', description: 'PLAYING or FINISHED' },
          { name: 'winner', type: 'String', description: 'Winner name when status is FINISHED' },
        ],
        methods: [],
      },
      {
        name: 'Token',
        description: 'Represents a single Ludo token with position tracking and state flags.',
        fields: [
          { name: 'id', type: 'int', description: 'Token index within player set (0-3)' },
          { name: 'color', type: 'String', description: 'Owner color (RED/GREEN/BLUE/YELLOW)' },
          { name: 'position', type: 'int', description: 'Track position. -1 = home, 0-51 = on track' },
          { name: 'isHome', type: 'boolean', description: 'True when token is in home base' },
          { name: 'isFinished', type: 'boolean', description: 'True when token has completed the circuit' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'LudoRepository encapsulates all data access behind semantic methods. The service never touches maps or locks directly, making the data layer independently testable and swappable.',
      },
      {
        name: 'Singleton Pattern (Spring)',
        used: true,
        explanation: '@Service and @Repository beans are Spring singletons, ensuring all requests share the same in-memory game state — critical since there is no database.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'LudoService receives LudoRepository via constructor injection. This decouples class creation from usage, enabling unit testing with mock repositories.',
      },
      {
        name: 'Strategy Pattern',
        used: false,
        explanation: 'Currently capture and safe-spot logic is inline. A CaptureStrategy interface with implementations (StandardCapture, SafeSpotProtection, HomeBaseImmunity) would make the capture rules configurable.',
      },
      {
        name: 'Observer Pattern',
        used: false,
        explanation: 'The frontend polls for state updates. A WebSocket-based observer would push dice roll results, captures, and win events to all connected clients in real-time.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'LudoService handles dice rolling, token movement, captures, and win detection. LudoRepository handles storage. Game/Token/Player are data models. Each has one reason to change.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new rule variant (e.g., three 6s = penalty) requires only modifying rollDice() and moveToken(). The core game flow (roll → move → check win) stays the same.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'LudoService depends on LudoRepository abstraction, not on ConcurrentHashMap directly. This allows swapping to a database-backed repository without changing service logic.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Capture logic is centralized in captureAtPosition(). Safe spot checking is a single isSafeSpot() method. The 52-cell modulo arithmetic is computed once, not duplicated.',
      },
      {
        name: 'Encapsulation',
        description: 'Token position is only modified through LudoService.moveToken(). The repository\'s internal map is never exposed. Game state transitions (PLAYING → FINISHED) are controlled by the service.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — State Protection',
        description: 'Each token\'s position, home, and finished state are only modified through controlled service methods. The Game object\'s currentPlayerIndex and diceValue ensure turn integrity.',
        alternative: 'Could expose fields directly for performance. Encapsulation ensures that captures, safe spot checks, and turn order are never bypassed.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Game contains Lists of Players and Tokens (composition). Players don\'t extend Token — they own Tokens. This models the real-world relationship correctly.',
        alternative: 'Could make Game extend a Board class. Composition is chosen because a Game has a board, players, and state — it\'s not a specialized kind of board.',
      },
      {
        name: 'Value Objects — Constants',
        description: 'START_POSITIONS, SAFE_SPOTS, and TRACK_SIZE are static constants on the Game class, providing a single source of truth for board geometry.',
        alternative: 'Could use an external configuration file. Constants on Game are chosen because board geometry is fixed and compile-time, not runtime-configurable.',
      },
      {
        name: 'State Pattern — Game Status',
        description: 'GameStatus enum (PLAYING, FINISHED) drives what operations are allowed. When FINISHED, rollDice() and moveToken() reject further moves.',
        alternative: 'Could use a boolean isFinished. Enum is chosen because it naturally extends (WAITING, PLAYING, FINISHED) and is more readable than a boolean.',
      },
    ],
    extensibility: [
      {
        area: 'Special Dice Rules',
        description: 'Implement three-consecutive-6s penalty (return last moved token home). Add "roll again on 6" animation on frontend. Modify rollDice() to track consecutive 6s.',
        difficulty: 'Easy',
      },
      {
        area: 'Home Column / Final Stretch',
        description: 'Add 6-position home column per player. Tokens that complete a full lap enter their home column. Exact dice value needed to reach the center. Modify win condition.',
        difficulty: 'Medium',
      },
      {
        area: 'Online Multiplayer',
        description: 'Add WebSocket support. Each player connects from their own browser. Game waits for 4 players to join before starting. Turns are synchronized via server push.',
        difficulty: 'Hard',
      },
      {
        area: 'Game Lobby / Rooms',
        description: 'Add room codes, join/leave mechanics. LudoRepository becomes multi-game. Service adds joinGame(roomCode, playerName). Frontend shows lobby before game starts.',
        difficulty: 'Medium',
      },
      {
        area: 'Bot Players',
        description: 'Add LudoBot that auto-plays: picks best token to move (prioritize captures, advance furthest, bring new tokens out on 6). Can replace human player slots.',
        difficulty: 'Medium',
      },
      {
        area: 'Board Animations',
        description: 'Frontend improvements: animated token movement along the track, dice roll animation, capture explosion effect, victory confetti. No backend changes needed.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaLudoRepository. Game state serialized as JSON or relational. Swap via Spring profile. Service layer unchanged due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  coffee: {
    title: 'Coffee Machine — Design Details',
    requirements: [
      'Coffee vending machine with 6 ingredients: Coffee Beans, Milk, Water, Sugar, Chocolate, Cream',
      '5 preset beverages: Espresso (₹120), Latte (₹150), Cappuccino (₹160), Mocha (₹180), Americano (₹130)',
      'Each beverage has a recipe specifying exact ingredient quantities needed',
      'Select beverage: checks if all ingredients are sufficient, reserves the selection',
      'Brew: consumes ingredients from inventory, transitions machine through IDLE → BREWING → COMPLETE',
      'Machine status: IDLE (ready), BREWING (in progress), COMPLETE (ready to serve), ERROR (insufficient)',
      'Refill ingredient: restocks any ingredient by specified amount, machine must be IDLE to reset from error',
      'Orders history: tracks all brewing attempts with status (PREPARING/COMPLETED/FAILED)',
      'Thread-safe concurrent access — multiple users can operate without race conditions on ingredient inventory',
    ],
    entities: [
      {
        name: 'CoffeeMachineService',
        description: 'Core business logic layer. Handles menu display, beverage selection with ingredient validation, brewing with inventory consumption, machine status tracking, and ingredient refilling.',
        fields: [
          { name: 'repository', type: 'CoffeeRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe brewing and inventory operations' },
        ],
        methods: [
          { name: 'getMenu()', returns: 'List<Beverage>', description: 'Returns all available beverages with prices and recipes' },
          { name: 'selectBeverage(beverageId)', returns: 'Map', description: 'Checks ingredient levels, reserves beverage for brewing' },
          { name: 'brew(beverageId)', returns: 'Map', description: 'Consumes ingredients, transitions machine through states, creates order' },
          { name: 'getStatus()', returns: 'Map', description: 'Returns machine status, current beverage, and all ingredient levels' },
          { name: 'refillIngredient(ingredient, amount)', returns: 'Map', description: 'Restocks a specific ingredient by given amount' },
        ],
      },
      {
        name: 'CoffeeRepository',
        description: 'In-memory data store using ConcurrentHashMap for beverages and synchronized list for orders. Seeds initial data: 6 ingredients with starting levels and 5 beverages with recipes.',
        fields: [
          { name: 'beverages', type: 'ConcurrentHashMap<Long, Beverage>', description: 'All beverages indexed by ID' },
          { name: 'machine', type: 'CoffeeMachine', description: 'Single machine state with ingredients and status' },
          { name: 'orders', type: 'List<Order>', description: 'Synchronized list of all brewing orders' },
        ],
        methods: [
          { name: 'getBeverages()', returns: 'List<Beverage>', description: 'Returns all beverages' },
          { name: 'getMachine()', returns: 'CoffeeMachine', description: 'Returns the machine state' },
          { name: 'addOrder(order)', returns: 'void', description: 'Thread-safe order storage' },
        ],
      },
      {
        name: 'Beverage',
        description: 'A menu item with its recipe defining ingredient requirements and pricing.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique identifier (1-5)' },
          { name: 'name', type: 'String', description: 'Espresso, Latte, Cappuccino, Mocha, or Americano' },
          { name: 'price', type: 'double', description: 'Price in INR (₹120-₹180)' },
          { name: 'recipe', type: 'Map<Ingredient, Integer>', description: 'Mapping of ingredient → amount needed' },
          { name: 'available', type: 'boolean', description: 'Whether the beverage is on the menu' },
        ],
        methods: [],
      },
      {
        name: 'CoffeeMachine',
        description: 'Singleton-like state object representing the physical coffee machine with its ingredient inventory and operational status.',
        fields: [
          { name: 'id', type: 'long', description: 'Machine identifier' },
          { name: 'status', type: 'String', description: 'IDLE, BREWING, COMPLETE, or ERROR' },
          { name: 'currentBeverage', type: 'String', description: 'Name of currently selected/brewing beverage' },
          { name: 'ingredients', type: 'Map<Ingredient, Integer>', description: 'Current inventory levels (g or ml)' },
        ],
        methods: [],
      },
      {
        name: 'Order',
        description: 'Tracks a brewing attempt from selection through completion.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique order identifier' },
          { name: 'beverageId', type: 'long', description: 'Which beverage was brewed' },
          { name: 'beverageName', type: 'String', description: 'Human-readable beverage name' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the order was created' },
          { name: 'status', type: 'String', description: 'PREPARING, COMPLETED, or FAILED' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'CoffeeRepository abstracts all data access behind semantic methods. The service calls getBeverages(), getMachine(), addOrder() rather than manipulating maps directly. This keeps the service focused on brewing logic.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring a single CoffeeMachine state is shared across all requests. This is critical since the machine has exactly one physical state.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'CoffeeMachineService receives CoffeeRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories and ingredient data.',
      },
      {
        name: 'State Machine Pattern',
        used: true,
        explanation: 'Machine status transitions through a clear lifecycle: IDLE → selected → BREWING → COMPLETE → IDLE (or ERROR → IDLE after reset). The service enforces valid transitions — you cannot brew while already brewing.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'CoffeeMachineService handles brewing business logic (inventory check, consumption, state transitions). CoffeeRepository handles data storage. Beverage/CoffeeMachine/Order are pure data models.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new beverage requires only adding an entry to the repository\'s seed data with a new recipe. The brewing logic remains unchanged. New ingredients can be added to the Ingredient enum without structural changes.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on concrete ConcurrentHashMap. Spring injects the implementation, enabling storage strategy swaps.',
      },
      {
        name: 'Encapsulation',
        description: 'Ingredient inventory is only modified through controlled service methods (brew consumes, refill restocks). Machine status transitions are enforced by service logic, preventing invalid states.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Inventory Protection',
        description: 'Ingredient levels are only modified through brew() and refillIngredient() methods. External code cannot directly add or remove ingredients from the machine, ensuring inventory integrity.',
        alternative: 'Could expose the inventory map directly. Encapsulation prevents accidental inventory corruption and ensures all mutations go through validation.',
      },
      {
        name: 'Enum-based Type Safety',
        description: 'Ingredient is an enum with 6 fixed constants. Recipe maps use Ingredient as keys, providing compile-time safety. Invalid ingredient names cannot accidentally be used.',
        alternative: 'Could use strings for ingredient names. Enum is chosen because it provides type safety, autocomplete, and prevents typos like "coffe" vs "coffee".',
      },
      {
        name: 'Polymorphism — Recipe-based Dispatching',
        description: 'Each beverage has its own recipe map. The same brew() code iterates over the recipe and consumes ingredients, regardless of which beverage is selected.',
        alternative: 'Could have per-beverage subclasses with custom brew() methods. Map-based recipe is more data-driven and makes adding new beverages trivial.',
      },
    ],
    extensibility: [
      {
        area: 'New Beverages',
        description: 'Add a new entry to the repository constructor with ID, name, price, and recipe map. The service code handles it automatically. Frontend just needs to display it.',
        difficulty: 'Easy',
      },
      {
        area: 'Custom Recipe Creator',
        description: 'Add an API endpoint to create custom beverages. Validate ingredient availability. Store custom beverages in a separate map. The existing brew() logic handles any recipe.',
        difficulty: 'Medium',
      },
      {
        area: 'Temperature Control',
        description: 'Add temperature setting per beverage. Machine model gets a heater element. Brew() sets temperature based on beverage type. Frontend shows temperature gauge.',
        difficulty: 'Medium',
      },
      {
        area: 'Payment Integration',
        description: 'Add payment validation before brewing. Machine only brews after payment confirmed. Add coin/bill acceptor simulation. Frontend shows payment UI before brew button.',
        difficulty: 'Medium',
      },
      {
        area: 'Maintenance Alerts',
        description: 'Add threshold warnings when ingredients run low (<20%). Machine automatically switches to ERROR when any ingredient reaches 0. Frontend shows restock alerts.',
        difficulty: 'Easy',
      },
      {
        area: 'Multi-Machine Support',
        description: 'Add Machine entity with ID. Repository manages Map<Long, CoffeeMachine>. Service takes machineId parameter. Frontend adds machine selector.',
        difficulty: 'Hard',
      },
    ],
  },

  wallet: {
    title: 'Digital Wallet — Design Details',
    requirements: [
      'Digital wallet system supporting multiple users with individual wallet accounts',
      'Each wallet has: user ID, user name, balance in INR, creation timestamp',
      'Create wallet: new wallet with ₹0 starting balance and unique ID',
      'Add funds: deposit money via payment methods (UPI, CARD, BANK_TRANSFER, WALLET_BALANCE)',
      'Send money: transfer between wallets with balance validation and minimum amount checks',
      'Transaction history: complete log of all credits, debits, and transfers per wallet',
      'Transactions track: from/to wallet IDs, amount, type (CREDIT/DEBIT/TRANSFER), status (COMPLETED/FAILED), timestamp, description',
      'Thread-safe concurrent access — ReentrantLock prevents race conditions on transfers',
    ],
    entities: [
      {
        name: 'WalletService',
        description: 'Core business logic for wallet operations. Handles wallet creation, fund addition with payment method tracking, peer-to-peer transfers with balance validation, and transaction history retrieval.',
        fields: [
          { name: 'repository', type: 'WalletRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic transfers and balance updates' },
        ],
        methods: [
          { name: 'createWallet(userId, userName)', returns: 'Wallet', description: 'Creates new wallet with ₹0 balance' },
          { name: 'getBalance(walletId)', returns: 'double', description: 'Returns current wallet balance' },
          { name: 'addFunds(walletId, amount, paymentMethod)', returns: 'Map', description: 'Adds money via specified payment method, records credit transaction' },
          { name: 'sendMoney(from, to, amount, description)', returns: 'Map', description: 'Validates balance, debits sender, credits recipient, records transfer' },
          { name: 'getTransactions(walletId)', returns: 'List<Transaction>', description: 'Returns complete transaction history for a wallet' },
        ],
      },
      {
        name: 'WalletRepository',
        description: 'In-memory data store with ConcurrentHashMap. Seeds 3 wallets (Alice: ₹5000, Bob: ₹3000, Charlie: ₹10000). Generates sequential IDs via AtomicLong.',
        fields: [
          { name: 'wallets', type: 'ConcurrentHashMap<Long, Wallet>', description: 'All wallets indexed by ID' },
          { name: 'transactions', type: 'ConcurrentHashMap<Long, List<Transaction>>', description: 'Transactions indexed by wallet ID' },
          { name: 'walletIdGen', type: 'AtomicLong', description: 'Sequential wallet ID generator' },
          { name: 'txnIdGen', type: 'AtomicLong', description: 'Sequential transaction ID generator' },
        ],
        methods: [
          { name: 'findWalletById(id)', returns: 'Wallet', description: 'O(1) wallet lookup' },
          { name: 'saveWallet(wallet)', returns: 'Wallet', description: 'Upserts wallet into map' },
          { name: 'addTransaction(txn)', returns: 'void', description: 'Thread-safe transaction storage per wallet' },
          { name: 'getTransactionsByWalletId(id)', returns: 'List<Transaction>', description: 'Returns transaction list for wallet' },
        ],
      },
      {
        name: 'Wallet',
        description: 'User wallet with balance and metadata. Balance is mutable only through controlled service operations.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique wallet identifier' },
          { name: 'userId', type: 'String', description: 'User\'s unique ID' },
          { name: 'userName', type: 'String', description: 'Display name of the wallet owner' },
          { name: 'balance', type: 'double', description: 'Current wallet balance in INR' },
          { name: 'currency', type: 'String', description: 'Currency code (INR)' },
          { name: 'createdAt', type: 'LocalDateTime', description: 'Timestamp of wallet creation' },
        ],
        methods: [],
      },
      {
        name: 'Transaction',
        description: 'Record of a financial operation affecting one or two wallets.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique transaction ID' },
          { name: 'fromWalletId', type: 'Long', description: 'Source wallet (null for direct credits)' },
          { name: 'toWalletId', type: 'Long', description: 'Destination wallet (null for debits)' },
          { name: 'amount', type: 'double', description: 'Transaction amount' },
          { name: 'type', type: 'String', description: 'CREDIT, DEBIT, or TRANSFER' },
          { name: 'status', type: 'String', description: 'PENDING, COMPLETED, or FAILED' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the transaction occurred' },
          { name: 'description', type: 'String', description: 'User-provided memo or system description' },
        ],
        methods: [],
      },
      {
        name: 'PaymentMethod',
        stereotype: 'enum',
        description: 'Supported payment methods for adding funds to wallets.',
        fields: [
          { name: 'UPI', type: 'enum constant', description: 'Unified Payments Interface — instant bank transfer' },
          { name: 'CARD', type: 'enum constant', description: 'Credit or debit card payment' },
          { name: 'BANK_TRANSFER', type: 'enum constant', description: 'Direct bank account transfer (NEFT/RTGS)' },
          { name: 'WALLET_BALANCE', type: 'enum constant', description: 'Use existing wallet balance (internal)' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'WalletRepository abstracts all data access behind semantic methods. The service calls findWalletById(), saveWallet(), addTransaction() rather than manipulating ConcurrentHashMap directly.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring a single consistent set of wallets and balances across all requests. Critical since all financial state lives in memory.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'WalletService receives WalletRepository via constructor injection. Spring auto-wires, enabling unit testing with mock repositories without needing to start the full Spring context.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'sendMoney() wraps debit and credit in a single ReentrantLock block, ensuring atomicity. If the debit succeeds but the credit fails (impossible with in-memory, but relevant for DB), the entire operation rolls back.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'WalletService handles business logic (balance validation, transfers). WalletRepository handles data persistence. Wallet/Transaction are pure data models. PaymentMethod is an enum type.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new payment method requires only adding an enum constant and updating frontend options. The fund addition logic remains unchanged. New transaction types can be added without structural changes.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on ConcurrentHashMap. This allows swapping to a database-backed repository via Spring configuration without changing service code.',
      },
      {
        name: 'Encapsulation',
        description: 'Wallet balance is only modified through addFunds() and sendMoney() methods. External code cannot directly set wallet balances. Transactions are immutable after creation.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Financial Integrity',
        description: 'Wallet balance has no public setter — only the service can modify it through controlled operations that enforce business rules (sufficient balance for transfers, positive amounts).',
        alternative: 'Could expose setBalance(). Controlled mutation prevents unauthorized balance changes and ensures every balance change is accompanied by a transaction record.',
      },
      {
        name: 'Value Objects — Transaction Records',
        description: 'Transactions are immutable after creation. All fields are set at construction and never modified. This provides a reliable audit trail.',
        alternative: 'Could make transactions mutable. Immutability prevents accidental modification of financial records and makes the history tamper-evident.',
      },
      {
        name: 'Enum-based Type Safety — Payment Methods',
        description: 'PaymentMethod enum provides compile-time safety for supported payment types. New methods can be added without changing method signatures.',
        alternative: 'Could use strings for payment methods. Enum provides autocomplete, prevents typos, and makes the fixed set of options explicit.',
      },
    ],
    extensibility: [
      {
        area: 'Multi-Currency Support',
        description: 'Add Currency enum with exchange rates. Wallet gets a currency field. Add convertCurrency(walletId, targetCurrency) method. Transactions store both original and converted amounts.',
        difficulty: 'Medium',
      },
      {
        area: 'Transaction Limits',
        description: 'Add daily/monthly transaction limits per wallet. sendMoney() checks limits before processing. Repository tracks daily totals. Exceeded limits return FAILED status.',
        difficulty: 'Easy',
      },
      {
        area: 'Scheduled Transfers',
        description: 'Add ScheduledPayment entity with recurrence (daily/weekly/monthly). A scheduled job processes due payments. Uses existing sendMoney() for execution.',
        difficulty: 'Medium',
      },
      {
        area: 'Fraud Detection',
        description: 'Add FraudDetectionService that analyzes transaction patterns: unusual amounts, rapid successive transfers, multiple failed attempts. Flags suspicious transactions as PENDING for review.',
        difficulty: 'Hard',
      },
      {
        area: 'QR Code Payments',
        description: 'Generate QR codes for wallet IDs. Frontend scans QR to auto-fill recipient. Backend adds generateQR(walletId) and processQRPayment(scannedId, amount) endpoints.',
        difficulty: 'Easy',
      },
      {
        area: 'Interest on Balance',
        description: 'Add daily interest calculation (e.g., 4% APR). A scheduled job credits interest to all wallets daily. Interest transactions have special type "INTEREST".',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaLudoRepository. Game state serialized as JSON or relational. Swap via Spring profile. Service layer unchanged due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  hotel: {
    title: 'Hotel Management — Design Details',
    requirements: [
      'Hotel management system with multiple hotels, rooms, and bookings',
      'Each hotel has a name, location, rating, and list of amenities',
      'Rooms are categorized as SINGLE, DOUBLE, SUITE, or DELUXE with different pricing',
      'Room states: AVAILABLE, BOOKED, OCCUPIED, MAINTENANCE — only AVAILABLE rooms can be booked',
      'Booking flow: book room (CONFIRMED) → check in (CHECKED_IN) → check out (CHECKED_OUT)',
      'Booking has associated guest name, check-in/out dates, and total amount (price × nights)',
      'Cancellation is allowed for CONFIRMED and CHECKED_IN bookings, restores room to AVAILABLE',
      'Thread-safe concurrent access via ReentrantLock — multiple guests can book simultaneously',
    ],
    entities: [
      {
        name: 'HotelService',
        description: 'Core business logic layer. Handles hotel search, room listing, booking, check-in, check-out, and cancellation. All booking state mutations are protected by ReentrantLock.',
        fields: [
          { name: 'repository', type: 'HotelRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic booking state transitions' },
        ],
        methods: [
          { name: 'getAllHotels()', returns: 'List<Hotel>', description: 'Returns all hotels in the system' },
          { name: 'getAvailableRooms(hotelId, dates)', returns: 'List<Room>', description: 'Returns available rooms for a hotel (simplified — all AVAILABLE status rooms)' },
          { name: 'bookRoom(roomId, userId, guestName, dates)', returns: 'Booking', description: 'Validates room availability → calculates total → marks room BOOKED → creates booking' },
          { name: 'checkIn(bookingId)', returns: 'Booking', description: 'Marks booking CHECKED_IN and room OCCUPIED' },
          { name: 'checkOut(bookingId)', returns: 'Booking', description: 'Marks booking CHECKED_OUT and room AVAILABLE' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking and restores room to AVAILABLE' },
        ],
      },
      {
        name: 'HotelRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'hotels', type: 'Map<String, Hotel>', description: 'All hotels indexed by ID (LinkedHashMap preserves order)' },
          { name: 'rooms', type: 'ConcurrentHashMap<String, Room>', description: 'All rooms indexed by ID' },
          { name: 'bookings', type: 'ConcurrentHashMap<String, Booking>', description: 'All bookings indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'getAvailableRooms(hotelId)', returns: 'List<Room>', description: 'Filters rooms by hotel and AVAILABLE status' },
          { name: 'generateBookingId()', returns: 'String', description: 'Atomic counter — produces "HBK-00001" format' },
          { name: 'saveBooking(booking)', returns: 'void', description: 'Thread-safe booking insert' },
          { name: 'getActiveBookings()', returns: 'List<Booking>', description: 'Returns CONFIRMED and CHECKED_IN bookings, sorted newest first' },
        ],
      },
      {
        name: 'Hotel',
        description: 'A hotel property with basic information and amenities.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (H1, H2)' },
          { name: 'name', type: 'String', description: 'Hotel display name, e.g. Grand Palace' },
          { name: 'location', type: 'String', description: 'City/location, e.g. Mumbai' },
          { name: 'rating', type: 'double', description: 'Star rating out of 5' },
          { name: 'amenities', type: 'List<String>', description: 'Facilities like Pool, Gym, Spa, WiFi' },
        ],
        methods: [],
      },
      {
        name: 'Room',
        description: 'A bookable room with type, pricing, and availability status.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (R1, R2)' },
          { name: 'roomNumber', type: 'String', description: 'Physical room number, e.g. 101' },
          { name: 'type', type: 'RoomType (enum)', description: 'SINGLE (₹3K), DOUBLE (₹5K), SUITE (₹12K), DELUXE (₹8K)' },
          { name: 'price', type: 'double', description: 'Per-night price in INR' },
          { name: 'status', type: 'RoomStatus (enum)', description: 'AVAILABLE, BOOKED, OCCUPIED, or MAINTENANCE' },
        ],
        methods: [
          { name: 'setStatus(status)', returns: 'void', description: 'Transitions room state, controlled by service' },
        ],
      },
      {
        name: 'Booking',
        description: 'A confirmed room reservation with guest info and payment details.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique booking identifier (HBK-00001)' },
          { name: 'roomId', type: 'String', description: 'Which room is booked' },
          { name: 'guestName', type: 'String', description: 'Name of the guest staying' },
          { name: 'checkIn', type: 'LocalDate', description: 'Check-in date' },
          { name: 'checkOut', type: 'LocalDate', description: 'Check-out date' },
          { name: 'status', type: 'BookingStatus (enum)', description: 'CONFIRMED → CHECKED_IN → CHECKED_OUT or CANCELLED' },
          { name: 'totalAmount', type: 'double', description: 'price × nights' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'HotelRepository abstracts all data access behind semantic methods. The service never touches maps directly — it calls getRoom(), generateBookingId(), and saveBooking(). This keeps business logic clean and enables testing with mock repositories.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository are singletons, ensuring one consistent state across all requests. Critical since all data lives in memory and must be shared across concurrent users.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'HotelService receives HotelRepository via constructor injection. Spring auto-wires the dependency, making the service testable without Spring container and allowing repository swaps.',
      },
      {
        name: 'State Pattern',
        used: true,
        explanation: 'Room and Booking use enum-based state machines. Room: AVAILABLE → BOOKED → OCCUPIED → AVAILABLE. Booking: CONFIRMED → CHECKED_IN → CHECKED_OUT. Each service method checks the current state and transitions accordingly, preventing invalid transitions.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'bookRoom() wraps room status change + booking creation in a single ReentrantLock block. If any step fails, no partial state is committed. checkOut() similarly atomically updates both booking and room.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'HotelService handles booking business logic (validation, pricing, state transitions). HotelRepository manages data storage. HotelController handles HTTP concerns. Each has one clear responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new room type requires only adding an enum constant and pricing. New room statuses can be added without changing booking flow. The system is open for extension of room types and statuses.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'HotelService depends on HotelRepository abstraction. Spring injects the concrete implementation. Switching from in-memory to database requires only a new repository implementation.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Room status validation is centralized in bookRoom/checkIn/checkOut methods. Booking ID generation is in one place. Amount calculation uses a single formula (price × nights).',
      },
      {
        name: 'Fail-Fast Validation',
        description: 'Each operation validates state before making changes: bookRoom checks AVAILABLE, checkIn checks CONFIRMED, checkOut checks CHECKED_IN. Invalid transitions are rejected immediately.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — State Machine',
        description: 'Room and Booking statuses are only modified through controlled service methods. External code cannot directly change room status from AVAILABLE to OCCUPIED without going through checkIn().',
        alternative: 'Could expose public setters. Controlled mutation via service is chosen because it enforces business rules (only CHECKED_IN bookings can transition to CHECKED_OUT).',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Booking contains roomId (reference to Room) and hotelId. Room contains a hotelId reference. Entities are linked by ID rather than through inheritance hierarchies.',
        alternative: 'Could make Booking extend Room. Composition is chosen because a Booking is not a type of Room — it represents a temporary usage of a room.',
      },
      {
        name: 'Enum-based State Machine',
        description: 'RoomStatus and BookingStatus enums define valid states and transitions. Service methods check current state before transitioning, making the state machine explicit and type-safe.',
        alternative: 'Could use String status fields. Enums are chosen because they are type-safe, self-documenting, and prevent invalid status values at compile time.',
      },
    ],
    extensibility: [
      {
        area: 'Dynamic Pricing (Seasonal/Holiday)',
        description: 'Add a pricing strategy that adjusts room prices based on season, day of week, or occupancy. Can be implemented as a PricingStrategy interface without changing booking flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Room Service / Addons',
        description: 'Add ServiceRequest entity (room service, housekeeping, spa). Booking can have optional addons. Extends booking without changing core check-in/out flow.',
        difficulty: 'Medium',
      },
      {
        area: 'Multiple Locations / Search',
        description: 'Extend search to support city, date range, guests count, room type filter. Add caching for popular searches. No changes to booking flow.',
        difficulty: 'Medium',
      },
      {
        area: 'Online Payment Gateway',
        description: 'Add PaymentService interface. Call payment.process(amount) during booking creation. Refund on cancellation. Existing amount calculation unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'Loyalty Program',
        description: 'Add loyalty points per booking (₹1 = 1 point). Redeem points for discounts. Track member tiers (Silver/Gold/Platinum) with tier-based benefits.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaHotelRepository. Swap via Spring @Profile. No service layer changes needed due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  airline: {
    title: 'Airline Reservation — Design Details',
    requirements: [
      'Airline reservation system with multiple flights, seats, and bookings',
      'Flights have source, destination, departure/arrival times, airline, and flight number',
      'Seats are categorized as ECONOMY, BUSINESS, or FIRST with different pricing',
      'Each flight has 30 seats (5 rows × 6 cols), with rows A-B as BUSINESS and C-E as ECONOMY',
      'Seat states: AVAILABLE or BOOKED — only AVAILABLE seats can be booked',
      'Users can search flights by source and destination, view seat map with availability',
      'Booking flow: select seats → create booking (CONFIRMED) → check in (CHECKED_IN)',
      'Booking can be cancelled, which restores seats to AVAILABLE and updates flight available count',
      'Thread-safe concurrent access via ReentrantLock — multiple users can book simultaneously without double-booking',
    ],
    entities: [
      {
        name: 'AirlineService',
        description: 'Core business logic for flight search and seat booking. Handles seat selection, booking creation, check-in, and cancellation with thread-safe operations.',
        fields: [
          { name: 'repository', type: 'AirlineRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic booking and cancellation operations' },
        ],
        methods: [
          { name: 'searchFlights(src, dest, date)', returns: 'List<Flight>', description: 'Filters flights by source and destination' },
          { name: 'getSeats(flightId)', returns: 'List<Seat>', description: 'Returns all seats for a flight' },
          { name: 'bookFlight(flightId, seatIds, userId, passenger)', returns: 'Booking', description: 'Validates seats → marks BOOKED → creates booking → updates flight availability — thread safe' },
          { name: 'checkIn(bookingId)', returns: 'Booking', description: 'Marks booking as CHECKED_IN' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking, restores seats and flight available count' },
        ],
      },
      {
        name: 'AirlineRepository',
        description: 'In-memory data store with ConcurrentHashMap and ReentrantLock for thread safety.',
        fields: [
          { name: 'flights', type: 'Map<String, Flight>', description: 'All flights indexed by ID' },
          { name: 'seats', type: 'ConcurrentHashMap<String, Seat>', description: 'All seats indexed by ID' },
          { name: 'bookings', type: 'ConcurrentHashMap<String, Booking>', description: 'All bookings indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic write operations' },
        ],
        methods: [
          { name: 'getAvailableSeatsByFlight(flightId)', returns: 'List<Seat>', description: 'Filters seats by flight and AVAILABLE status' },
          { name: 'generateBookingId()', returns: 'String', description: 'Atomic counter — produces "ABK-00001" format' },
          { name: 'saveBooking(booking)', returns: 'void', description: 'Thread-safe booking insert' },
          { name: 'getActiveBookings()', returns: 'List<Booking>', description: 'Returns CONFIRMED and CHECKED_IN bookings' },
        ],
      },
      {
        name: 'Flight',
        description: 'A scheduled flight with route, timing, and availability information.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (F1, F2)' },
          { name: 'flightNumber', type: 'String', description: 'Airline flight number, e.g. 6E-201' },
          { name: 'airline', type: 'String', description: 'Airline name, e.g. IndiGo' },
          { name: 'source', type: 'String', description: 'Departure city' },
          { name: 'destination', type: 'String', description: 'Arrival city' },
          { name: 'departureTime', type: 'LocalDateTime', description: 'Scheduled departure' },
          { name: 'arrivalTime', type: 'LocalDateTime', description: 'Scheduled arrival' },
          { name: 'totalSeats', type: 'int', description: 'Total seat count (30 per flight)' },
          { name: 'availableSeats', type: 'int', description: 'Currently available (decremented on booking)' },
          { name: 'fare', type: 'double', description: 'Base fare in INR' },
        ],
        methods: [],
      },
      {
        name: 'Seat',
        description: 'A specific seat on a flight with class, pricing, and availability.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique identifier (S1-S120 for 4 flights)' },
          { name: 'row', type: 'String', description: 'Row label (A-E)' },
          { name: 'col', type: 'String', description: 'Column number (1-6)' },
          { name: 'classType', type: 'SeatClass (enum)', description: 'ECONOMY, BUSINESS, or FIRST' },
          { name: 'price', type: 'double', description: 'Seat-specific price (Business = 2.5× base fare)' },
          { name: 'status', type: 'SeatStatus (enum)', description: 'AVAILABLE or BOOKED' },
        ],
        methods: [
          { name: 'setStatus(status)', returns: 'void', description: 'Transitions seat state, controlled by service' },
        ],
      },
      {
        name: 'Booking',
        description: 'A confirmed flight booking with passenger details and seat assignments.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique booking identifier (ABK-00001)' },
          { name: 'flightId', type: 'String', description: 'Which flight is booked' },
          { name: 'seatIds', type: 'List<String>', description: 'List of booked seat IDs' },
          { name: 'passengerName', type: 'String', description: 'Name of the passenger' },
          { name: 'status', type: 'BookingStatus (enum)', description: 'CONFIRMED → CHECKED_IN or CANCELLED' },
          { name: 'totalAmount', type: 'double', description: 'Sum of all booked seat prices' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'AirlineRepository encapsulates all data access behind semantic methods. The service calls getSeat(), updateSeat(), and saveBooking() rather than directly manipulating maps. This separates persistence concerns from business logic.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure consistent state across concurrent requests. Critical for preventing double-booking in an in-memory system.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'AirlineService receives AirlineRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories and allowing storage swaps.',
      },
      {
        name: 'Unit of Work',
        used: true,
        explanation: 'bookFlight() wraps all operations (validate seats → mark BOOKED → update flight → create booking) in a single ReentrantLock block. If any step fails, no partial state is committed. cancelBooking() similarly atomically restores seats and flight count.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'AirlineService handles booking business logic (seat validation, pricing, state transitions). AirlineRepository manages data storage. AirlineController handles HTTP concerns. Each has one clear responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new seat class (e.g., PREMIUM_ECONOMY) requires only adding an enum constant and price mapping. New booking statuses can be added without changing core book/cancel flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'AirlineService depends on AirlineRepository abstraction. Spring injects the concrete implementation. Switching storage (e.g., to Redis) requires only a new repository implementation.',
      },
      {
        name: 'Fail-Fast Validation',
        description: 'bookFlight() validates all seats before marking any as BOOKED. If any seat is already taken, the entire operation fails before any state change, preventing partial bookings.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Seat State Protection',
        description: 'Seat status is only modified through service.bookFlight() and cancelBooking(). External code cannot accidentally mark seats as available or booked.',
        alternative: 'Could expose public setters. Controlled mutation via service prevents double-booking bugs.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Booking contains a list of seat IDs and a flight ID (composition). Flight does not extend a base route class — it composes source/destination as fields.',
        alternative: 'Could extend a Route class. Composition is preferred because a Flight is not a specialized route — it has scheduling, pricing, and availability.',
      },
      {
        name: 'Enum-based Typing',
        description: 'SeatClass, SeatStatus, and BookingStatus enums provide type-safe categorization. Each drives switch/if-else logic for pricing (Business = 2.5× fare) and state transitions.',
        alternative: 'Could use String constants. Enums provide compile-time safety, IDE autocomplete, and prevent invalid values.',
      },
    ],
    extensibility: [
      {
        area: 'Dynamic Fare Pricing',
        description: 'Replace fixed 2.5× multiplier with a FareStrategy. Peak hours, advance booking discounts, and last-minute premiums can be implemented without changing booking flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Meal Preferences',
        description: 'Add MealPreference enum (VEG, NON_VEG, VEGAN) to Booking. Extend seat selection with meal option. No change to core booking flow.',
        difficulty: 'Easy',
      },
      {
        area: 'Baggage Tracking',
        description: 'Add Baggage entity linked to Booking. Track check-in, loaded, unloaded, and claimed status. Extends check-in flow without modifying seat booking.',
        difficulty: 'Medium',
      },
      {
        area: 'Flight Status / Delays',
        description: 'Add status field to Flight (SCHEDULED, BOARDING, DEPARTED, LANDED, CANCELLED). Frontend shows real-time status. Service can notify affected bookings.',
        difficulty: 'Medium',
      },
      {
        area: 'Group Bookings',
        description: 'Allow booking multiple passengers in one transaction. Frontend shows group booking form. Backend creates multiple bookings atomically.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaAirlineRepository. Swap via Spring @Profile. No service layer changes needed due to Dependency Injection.',
        difficulty: 'Medium',
      },
    ],
  },

  minesweeper: {
    title: 'Minesweeper — Design Details',
    requirements: [
      'Classic Minesweeper game on a grid with N rows × M columns',
      'M mines are randomly placed on the board (configurable difficulty)',
      'Left-click to reveal a cell; if it\'s a mine → game over (LOST)',
      'If revealed cell has 0 adjacent mines → flood-fill (BFS) reveals all neighboring cells recursively',
      'If revealed cell has N adjacent mines → shows number N (1-8)',
      'Right-click to toggle a flag on a cell; flag counter tracks flags used vs total mines',
      'Win condition: all non-mine cells are revealed (WON)',
      'Thread-safe concurrent access via ReentrantLock — multiple reveal/flag operations are atomic',
    ],
    entities: [
      {
        name: 'MinesweeperService',
        description: 'Core business logic for Minesweeper. Handles game creation (mine placement + adjacency calculation), cell reveal (with flood-fill BFS), flag toggle, and win/loss detection.',
        fields: [
          { name: 'repository', type: 'MinesweeperRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures thread-safe game mutations' },
          { name: 'random', type: 'Random', description: 'Random number generator for mine placement' },
        ],
        methods: [
          { name: 'createGame(rows, cols, mines)', returns: 'Game', description: 'Creates board, randomly places mines, calculates adjacent counts for each cell' },
          { name: 'revealCell(gameId, row, col)', returns: 'Game', description: 'Reveals cell; if mine → LOST; if 0 adjacent → flood-fill; checks win condition' },
          { name: 'flagCell(gameId, row, col)', returns: 'Game', description: 'Toggles flag on cell (only on hidden cells), tracks flag count' },
          { name: 'getGame(id)', returns: 'Game', description: 'Returns current game state (hides mine positions while game is PLAYING)' },
        ],
      },
      {
        name: 'MinesweeperRepository',
        description: 'In-memory data store using ConcurrentHashMap for thread-safe game storage.',
        fields: [
          { name: 'games', type: 'ConcurrentHashMap<Long, Game>', description: 'All games indexed by ID' },
        ],
        methods: [
          { name: 'save(game)', returns: 'void', description: 'Stores/updates game in the map' },
          { name: 'get(id)', returns: 'Game', description: 'Retrieves game by ID' },
        ],
      },
      {
        name: 'Game',
        description: 'Central entity holding the Minesweeper board, game state, and statistics.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique game identifier' },
          { name: 'board', type: 'Cell[][]', description: '2D array of cells (rows × cols)' },
          { name: 'rows', type: 'int', description: 'Number of rows' },
          { name: 'cols', type: 'int', description: 'Number of columns' },
          { name: 'totalMines', type: 'int', description: 'Total number of mines on the board' },
          { name: 'status', type: 'GameStatus', description: 'PLAYING, WON, or LOST' },
          { name: 'flagsUsed', type: 'int', description: 'Number of flags currently placed' },
          { name: 'revealedCount', type: 'int', description: 'Number of successfully revealed cells' },
        ],
        methods: [],
      },
      {
        name: 'Cell',
        description: 'A single cell on the Minesweeper board with position and state.',
        fields: [
          { name: 'row', type: 'int', description: 'Row index (0-based)' },
          { name: 'col', type: 'int', description: 'Column index (0-based)' },
          { name: 'isMine', type: 'boolean', description: 'Whether this cell contains a mine' },
          { name: 'isRevealed', type: 'boolean', description: 'Whether the cell has been revealed' },
          { name: 'isFlagged', type: 'boolean', description: 'Whether the cell is flagged (cannot be revealed while flagged)' },
          { name: 'adjacentMines', type: 'int', description: 'Count of mines in adjacent cells (0-8). -1 if this cell itself is a mine' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'MinesweeperRepository abstracts all data access behind semantic methods like save() and get(). The service never touches maps directly, keeping business logic clean and the data layer swappable.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure one consistent game state across all requests. Critical since all game data lives in memory.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'MinesweeperService receives MinesweeperRepository via constructor injection. Spring auto-wires the dependency, enabling easy testing with mock repositories.',
      },
      {
        name: 'Observer Pattern',
        used: false,
        explanation: 'The frontend polls for game state updates. A WebSocket-based observer would push cell reveal events and game-over notifications in real-time without polling.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'MinesweeperService handles game logic (mine placement, reveal, flood-fill, win/loss). MinesweeperRepository handles data storage. GameController handles HTTP mapping. Each has one reason to change.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding new difficulty presets (rows/cols/mines combinations) requires no code changes to the core game logic. New cell states or game features can be added without modifying the existing reveal/flag flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on ConcurrentHashMap directly. Spring injects the concrete implementation, enabling storage strategy swaps.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Flood-fill logic is a single recursive function reused for all zero-count reveals. Adjacent mine counting uses one loop structure. Win check is a single formula (revealed + mines = total).',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — Cell State Protection',
        description: 'Cell state (revealed, flagged, mine) is only modified through controlled service methods (revealCell, flagCell). External code cannot accidentally expose mines or modify the board.',
        alternative: 'Could expose cell fields as public. Controlled mutation via service ensures game rules are always enforced (can\'t flag a revealed cell, can\'t reveal a flagged cell).',
      },
      {
        name: 'Recursion — Flood-Fill Algorithm',
        description: 'When a cell with 0 adjacent mines is revealed, the service recursively reveals all 8 neighboring cells. If those also have 0 mines, the recursion continues (BFS-style). This mirrors the classic Minesweeper behavior.',
        alternative: 'Could use an iterative queue-based BFS. Recursion is chosen because it\'s simpler and the board size is small (max 256 cells), so stack overflow is not a concern.',
      },
      {
        name: '2D Array Composition',
        description: 'The board is a 2D array of Cell objects. The Game contains the board, not extends it. This composition approach allows the board to be easily accessed via grid coordinates.',
        alternative: 'Could use a flat array with index = row × cols + col. 2D array is chosen because it makes coordinate-based operations (neighbor lookup, flood-fill) more intuitive.',
      },
    ],
    extensibility: [
      {
        area: 'New Difficulty Levels',
        description: 'Add new preset to the frontend selector with custom rows/cols/mines. Backend already accepts these as parameters. No code changes needed.',
        difficulty: 'Easy',
      },
      {
        area: 'Timer / Leaderboard',
        description: 'Add timer field to Game. Track completion time. Frontend shows elapsed time. Leaderboard stores best times per difficulty. RevealCell stops timer on game over.',
        difficulty: 'Medium',
      },
      {
        area: 'First-Click Safety',
        description: 'Guarantee first reveal is never a mine. In createGame(), delay mine placement until first reveal. Place mines avoiding the first-click cell and its neighbors.',
        difficulty: 'Medium',
      },
      {
        area: 'Auto-Flag / Chord Reveal',
        description: 'Chord reveal: if a revealed number cell has N flagged neighbors and N = adjacentMines, auto-reveal remaining neighbors. Reduces repetitive clicking.',
        difficulty: 'Medium',
      },
      {
        area: 'Mine-Free Zones (Patterns)',
        description: 'Allow creating predefined patterns (e.g., guaranteed safe border). Useful for puzzles. Requires only changing mine placement logic in createGame().',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaMinesweeperRepository. Swap via Spring @Profile. Service layer unchanged.',
        difficulty: 'Medium',
      },
    ],
  },

  vendingmachine: {
    title: 'Vending Machine — Design Details',
    requirements: [
      'Vending machine with 10 products across 3 categories: Beverages (5), Snacks (3), Food (2)',
      'Products displayed in a 10-slot grid (2 rows × 5 cols) with name, price, and stock level',
      'Select a product → system reserves stock and creates a PENDING transaction with total amount',
      'Insert coins (₹5/10/20/50) incrementally until total amount is met or exceeded',
      'Once amount ≥ total, system transitions to PAID and allows dispensing',
      'Dispensing: stock is decremented, change is calculated (inserted - total), transaction is COMPLETED',
      'Cancel: pending transactions can be cancelled, releasing reserved stock',
      'State machine: IDLE → SELECTING → DISPENSING → COMPLETE → IDLE',
      'Thread-safe concurrent access via ReentrantLock — one transaction at a time',
    ],
    entities: [
      {
        name: 'VendingMachineService',
        description: 'Core business logic with a state machine pattern. Manages product selection, coin insertion, dispensing, and transaction lifecycle through IDLE → SELECTING → DISPENSING → COMPLETE states.',
        fields: [
          { name: 'repository', type: 'VendingRepository', description: 'Data access layer injected via constructor' },
          { name: 'state', type: 'VendingState', description: 'Current machine state (IDLE/SELECTING/DISPENSING/COMPLETE)' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic operations — one transaction at a time' },
        ],
        methods: [
          { name: 'getProducts()', returns: 'List<Map>', description: 'Returns all products with slots, prices, and stock levels' },
          { name: 'selectProduct(productId, quantity)', returns: 'Transaction', description: 'Checks stock → reserves product → creates PENDING transaction' },
          { name: 'insertCoin(transactionId, amount)', returns: 'Transaction', description: 'Adds to inserted amount; if >= total, marks PAID and transitions to DISPENSING' },
          { name: 'dispense(transactionId)', returns: 'Transaction', description: 'Decrements stock from products and slots → calculates change → marks COMPLETED' },
          { name: 'cancelTransaction(transactionId)', returns: 'Transaction', description: 'Cancels PENDING/PAID transaction, releases stock, returns to IDLE' },
        ],
      },
      {
        name: 'VendingRepository',
        description: 'In-memory data store with ConcurrentHashMap and seed data for 10 products with assigned slots.',
        fields: [
          { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'All products indexed by ID (10 products pre-seeded)' },
          { name: 'slots', type: 'ConcurrentHashMap<Long, Slot>', description: 'All slots indexed by ID (10 slots, one per product)' },
          { name: 'transactions', type: 'ConcurrentHashMap<Long, Transaction>', description: 'All transactions indexed by ID' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic product/stock operations' },
        ],
        methods: [
          { name: 'getAllProducts()', returns: 'List<Product>', description: 'Returns all products sorted by ID' },
          { name: 'findSlotByProductId(id)', returns: 'Slot', description: 'Finds the slot containing a specific product' },
          { name: 'saveTransaction(txn)', returns: 'void', description: 'Thread-safe transaction storage' },
        ],
      },
      {
        name: 'Product',
        description: 'A vendible item with pricing and inventory tracking.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique product identifier' },
          { name: 'name', type: 'String', description: 'Product name (Coke, Pepsi, Water, etc.)' },
          { name: 'price', type: 'double', description: 'Price in INR (₹10-₹50)' },
          { name: 'quantity', type: 'int', description: 'Total inventory count' },
          { name: 'category', type: 'String', description: 'Beverage, Snack, or Food' },
        ],
        methods: [],
      },
      {
        name: 'Slot',
        description: 'A physical slot in the vending machine containing a product with capacity tracking.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique slot identifier' },
          { name: 'productId', type: 'long', description: 'Which product is in this slot' },
          { name: 'row', type: 'int', description: 'Grid row position (0-1)' },
          { name: 'col', type: 'int', description: 'Grid column position (0-3)' },
          { name: 'capacity', type: 'int', description: 'Max capacity (5 per slot)' },
          { name: 'currentStock', type: 'int', description: 'How many units are currently in the slot' },
        ],
        methods: [],
      },
      {
        name: 'Transaction',
        description: 'A purchase transaction tracking the entire lifecycle from selection to completion.',
        fields: [
          { name: 'id', type: 'long', description: 'Unique transaction identifier' },
          { name: 'selectedProductIds', type: 'List<Long>', description: 'IDs of selected products' },
          { name: 'totalAmount', type: 'double', description: 'Total cost of selected items' },
          { name: 'insertedAmount', type: 'double', description: 'Cumulative money inserted' },
          { name: 'change', type: 'double', description: 'Change returned (inserted - total, 0 if exact)' },
          { name: 'status', type: 'String', description: 'PENDING → PAID → COMPLETED or CANCELLED' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the transaction was created' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      {
        name: 'Repository Pattern',
        used: true,
        explanation: 'VendingRepository abstracts all data access behind semantic methods. The service calls getProduct(), findSlotByProductId(), and saveTransaction() rather than manipulating maps directly.',
      },
      {
        name: 'Singleton Pattern',
        used: true,
        explanation: 'Spring @Service and @Repository singletons ensure a single machine state shared across all requests. This is critical since a physical vending machine has exactly one state.',
      },
      {
        name: 'Dependency Injection (IoC)',
        used: true,
        explanation: 'VendingMachineService receives VendingRepository via constructor injection. Spring auto-wires, enabling easy testing with mock repositories.',
      },
      {
        name: 'State Machine Pattern',
        used: true,
        explanation: 'VendingState enum drives the machine lifecycle: IDLE → SELECTING (product selected) → DISPENSING (payment complete) → COMPLETE (product dispensed). Service methods check and transition state, preventing invalid operations (cannot dispense without payment).',
      },
      {
        name: 'Template Method Pattern',
        used: false,
        explanation: 'The insert-pay-dispense flow is fixed, but payment methods could vary (coins, card, UPI). A PaymentProcessor interface with CoinPayment, CardPayment, UpiPayment implementations would make payment extensible.',
      },
    ],
    principles: [
      {
        name: 'Single Responsibility (SRP)',
        description: 'VendingMachineService handles business logic (selection, payment, dispensing). VendingRepository handles data storage. VendingController handles HTTP mapping. Each has one clear responsibility.',
      },
      {
        name: 'Open/Closed (OCP)',
        description: 'Adding a new product requires only adding an entry in the repository seed data. New payment methods can be added without modifying the core select → pay → dispense flow.',
      },
      {
        name: 'Dependency Inversion (DIP)',
        description: 'Service depends on repository abstraction, not on ConcurrentHashMap directly. Spring injects the concrete implementation, enabling storage strategy swaps.',
      },
      {
        name: 'DRY (Don\'t Repeat Yourself)',
        description: 'Stock validation is in selectProduct(). Change calculation is a single formula in dispense(). Status transitions are managed by the state machine in one place.',
      },
    ],
    oopConcepts: [
      {
        name: 'Encapsulation — State Machine',
        description: 'VendingState is only modified by the service through controlled methods. External code cannot directly set the machine state, ensuring the lifecycle (IDLE → SELECTING → DISPENSING → COMPLETE) is always respected.',
        alternative: 'Could expose state as a public field. Encapsulation prevents invalid transitions like going directly from IDLE to COMPLETE without payment.',
      },
      {
        name: 'Composition over Inheritance',
        description: 'Transaction contains a list of product IDs (composition). Slot does not extend Product — it references a productId. This models the real-world relationship: slots contain products, they don\'t become products.',
        alternative: 'Could make Slot extend Product. Composition is chosen because a Slot is not a type of Product — it\'s a physical location that holds inventory.',
      },
      {
        name: 'State Pattern — Lifecycle Management',
        description: 'VendingState enum drives what operations are allowed at each stage. SELECTING allows insertCoin but not dispense. DISPENSING allows dispense but not select. This prevents illegal operations at the state level.',
        alternative: 'Could use boolean flags (isPaid, isSelected). Enum is chosen because it naturally represents a finite state machine with clear transitions between states.',
      },
    ],
    extensibility: [
      {
        area: 'More Products / Slots',
        description: 'Add new products and slots in the repository constructor. Increase grid size on frontend. Backend handles it automatically.',
        difficulty: 'Easy',
      },
      {
        area: 'Card / UPI Payment',
        description: 'Add PaymentMethod enum (COIN, CARD, UPI). Extend insertCoin() to accept payment method type. Add virtual card reader simulation on frontend.',
        difficulty: 'Medium',
      },
      {
        area: 'Multi-Quantity Purchase',
        description: 'The backend already supports quantity in selectProduct(). Frontend needs a quantity selector per product. dispense() handles multiple items.',
        difficulty: 'Easy',
      },
      {
        area: 'Maintenance Mode',
        description: 'Add MAINTENANCE state. Refill stock via admin endpoint. Frontend shows maintenance overlay. Regular operations blocked in MAINTENANCE state.',
        difficulty: 'Medium',
      },
      {
        area: 'Discount / Promotions',
        description: 'Add DiscountService. Apply percentage or BOGO offers during selectProduct(). Frontend shows discounted price. Core payment/dispense flow unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'Nutritional Info Display',
        description: 'Add nutritional info fields to Product. Frontend shows calorie/sugar info on product click. No backend logic changes.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement JpaVendingRepository. Swap via Spring @Profile. Service layer unchanged.',
        difficulty: 'Medium',
      },
    ],
  },

  inventory: {
    title: 'Inventory Management — Design Details',
    requirements: [
      'Product catalog with SKU, category, pricing, stock levels, and reorder thresholds',
      'Stock movements tracking: INBOUND (restock), OUTBOUND (sale), TRANSFER (warehouse to warehouse)',
      'Low stock alerts — products below reorder level are flagged for restocking',
      'Color-coded stock status: green (sufficient), yellow (low), red (critical)',
      'Warehouse transfer support — move stock between locations with full traceability',
      'Thread-safe concurrent stock updates with ReentrantLock to prevent race conditions',
      'Supplier management — each product linked to a supplier for procurement tracking',
    ],
    entities: [
      {
        name: 'InventoryService',
        description: 'Core business logic layer. Handles product CRUD, stock movements (INBOUND/OUTBOUND/TRANSFER), low-stock queries, and supplier management. All stock-modifying operations are thread-safe.',
        fields: [
          { name: 'repository', type: 'InventoryRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic stock update operations' },
        ],
        methods: [
          { name: 'addProduct(product)', returns: 'Product', description: 'Creates a new product with auto-generated ID' },
          { name: 'getProducts(category)', returns: 'List<Product>', description: 'Lists all products, optionally filtered by category' },
          { name: 'updateStock(productId, qty, type, reason)', returns: 'StockMovement', description: 'INBOUND adds stock, OUTBOUND reduces; creates movement record' },
          { name: 'getLowStockItems(threshold)', returns: 'List<Product>', description: 'Products with currentStock <= threshold' },
          { name: 'transferStock(productId, from, to, qty)', returns: 'StockMovement', description: 'Moves stock between warehouse locations' },
          { name: 'getStockMovements(productId)', returns: 'List<StockMovement>', description: 'Full movement history for a product' },
        ],
      },
      {
        name: 'InventoryRepository',
        description: 'In-memory data store using ConcurrentHashMap and ReentrantLock. Seeds 8 products across 4 categories with varying stock levels and 3 suppliers.',
        fields: [
          { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'Product catalog indexed by ID' },
          { name: 'suppliers', type: 'ConcurrentHashMap<Long, Supplier>', description: 'Supplier directory indexed by ID' },
          { name: 'movements', type: 'ConcurrentHashMap<Long, List<StockMovement>>', description: 'Stock movements indexed by productId' },
          { name: 'productIdGen', type: 'AtomicLong', description: 'Auto-incrementing product ID generator' },
        ],
      },
      {
        name: 'StockMovement',
        description: 'Records every stock change with type, quantity, timestamp, reason, and reference ID for full audit trail.',
        fields: [
          { name: 'type', type: 'StockMovementType', value: 'INBOUND | OUTBOUND | TRANSFER', description: 'Direction of stock movement' },
          { name: 'productId', type: 'long', description: 'Product whose stock changed' },
          { name: 'quantity', type: 'int', description: 'Number of units moved (always positive)' },
          { name: 'referenceId', type: 'String', description: 'Business reference e.g. PO-001 or TRF-123' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Repository Pattern', description: 'InventoryRepository abstracts data storage behind a clean interface. Service never touches ConcurrentHashMap directly.' },
      { name: 'Service Layer', description: 'InventoryService encapsulates all business logic with ReentrantLock for thread-safe stock operations.' },
      { name: 'Value Object', description: 'StockMovement is an immutable-like value object representing a domain event.' },
      { name: 'Strategy (implicit)', description: 'Stock update type (INBOUND vs OUTBOUND) acts as a strategy for how quantities affect currentStock.' },
    ],
    solid: [
      { principle: 'S — Single Responsibility', description: 'Product owns product data, StockMovement owns movement data, InventoryService owns business logic, InventoryRepository owns persistence.' },
      { principle: 'O — Open/Closed', description: 'New StockMovementType values can be added without changing existing code. New categories extend the enum safely.' },
      { principle: 'L — Liskov Substitution', description: 'All repository methods return interfaces (List). Any List implementation works without breaking callers.' },
      { principle: 'I — Interface Segregation', description: 'Service exposes fine-grained methods (addProduct, updateStock, transferStock) rather than one generic method.' },
      { principle: 'D — Dependency Inversion', description: 'Controller depends on InventoryService abstraction, not concrete implementation. Spring DI handles wiring.' },
    ],
    oop: [
      { name: 'Encapsulation', description: 'Product hides its stock mutation behind service methods. External code cannot modify stock directly.' },
      { name: 'Inheritance', description: 'All model classes extend Object. StockMovementType is an enum inheriting Enum behaviors.' },
      { name: 'Polymorphism', description: 'getProducts() works with or without category filter via overloaded repository methods.' },
      { name: 'Abstraction', description: 'StockMovement abstracts the concept of inventory change regardless of direction or reason.' },
    ],
    extensibility: [
      {
        area: 'New Movement Types',
        description: 'Add a new value to StockMovementType enum (e.g., DAMAGED, RETURN). Service logic for handling it goes in updateStock().',
        difficulty: 'Easy',
      },
      {
        area: 'Batch Operations',
        description: 'Add batchUpdateStock() that processes multiple products atomically using the existing ReentrantLock.',
        difficulty: 'Medium',
      },
      {
        area: 'Database Persistence',
        description: 'Implement InventoryJpaRepository. Swap via Spring @Profile. Service unchanged.',
        difficulty: 'Medium',
      },
      {
        area: 'Analytics Dashboard',
        description: 'Add InventoryAnalyticsService that computes turnover rates, stock aging, and movement patterns from existing StockMovement records.',
        difficulty: 'Medium',
      },
      {
        area: 'Multi-Warehouse',
        description: 'Add Warehouse entity with location field. StockMovement gets fromLocation/toLocation. Transfer becomes cross-warehouse.',
        difficulty: 'Hard',
      },
    ],
  },

  shoppingcart: {
    title: 'Shopping Cart — Design Details',
    requirements: [
      'Product catalog with name, description, price, image, category, and available quantity',
      'Cart management — add items, remove items, update quantities with real-time total calculation',
      'Checkout flow — converts cart to order, clears cart, tracks order status through lifecycle',
      'Order state machine: PENDING → CONFIRMED → SHIPPED → DELIVERED, or CANCELLED from any state',
      'Thread-safe concurrent cart operations — multiple items can be added/removed simultaneously',
      'Seed data with 8 diverse products across categories for out-of-the-box testing',
    ],
    entities: [
      {
        name: 'ShoppingCartService',
        description: 'Core business logic. Manages product catalog, cart operations, checkout flow, and order lifecycle. All cart-modifying operations are thread-safe with ReentrantLock.',
        fields: [
          { name: 'repository', type: 'ShoppingCartRepository', description: 'Data access layer injected via constructor' },
          { name: 'lock', type: 'ReentrantLock', description: 'Ensures atomic cart and order operations' },
        ],
        methods: [
          { name: 'getProducts()', returns: 'List<Product>', description: 'Returns full product catalog' },
          { name: 'addToCart(cartId, userId, productId, qty)', returns: 'Cart', description: 'Adds item to cart; creates cart if cartId=0' },
          { name: 'removeFromCart(cartId, productId)', returns: 'Cart', description: 'Removes item from cart entirely' },
          { name: 'updateQuantity(cartId, productId, qty)', returns: 'Cart', description: 'Changes item quantity; removes if qty<=0' },
          { name: 'checkout(cartId, shippingAddress)', returns: 'Order', description: 'Creates order from cart items, clears cart' },
          { name: 'updateOrderStatus(orderId, status)', returns: 'Order', description: 'Advances order through state machine' },
        ],
      },
      {
        name: 'ShoppingCartRepository',
        description: 'In-memory data store using ConcurrentHashMap. Seeds 8 products across Electronics, Clothing, Footwear, Accessories, Kitchen, and Stationery categories.',
        fields: [
          { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'Product catalog indexed by ID' },
          { name: 'carts', type: 'ConcurrentHashMap<Long, Cart>', description: 'Active carts indexed by cart ID' },
          { name: 'orders', type: 'ConcurrentHashMap<Long, Order>', description: 'Completed orders indexed by order ID' },
        ],
      },
      {
        name: 'Cart',
        description: 'Value object representing a user shopping cart. Contains a Map<productId, CartItem> for O(1) item lookup and automatic total recalculation.',
        fields: [
          { name: 'items', type: 'Map<Long, CartItem>', description: 'Cart items indexed by productId for fast lookup' },
          { name: 'totalAmount', type: 'double', description: 'Auto-computed sum of all item totalPrices' },
          { name: 'createdAt', type: 'LocalDateTime', description: 'Timestamp when cart was first created' },
        ],
      },
      {
        name: 'Order',
        description: 'Value object capturing a completed purchase. Follows status state machine. Delivery time is set when status becomes DELIVERED.',
        fields: [
          { name: 'status', type: 'OrderStatus', value: 'PENDING→CONFIRMED→SHIPPED→DELIVERED', description: 'Order lifecycle state' },
          { name: 'items', type: 'List<CartItem>', description: 'Snapshot of cart items at checkout time' },
          { name: 'shippingAddress', type: 'String', description: 'Delivery destination' },
          { name: 'deliveryTime', type: 'LocalDateTime', description: 'Set when status becomes DELIVERED' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Repository Pattern', description: 'ShoppingCartRepository abstracts storage behind clean interface. Service never touches ConcurrentHashMap directly.' },
      { name: 'Service Layer', description: 'ShoppingCartService encapsulates all business logic with ReentrantLock for thread safety.' },
      { name: 'State Machine', description: 'OrderStatus enum defines the order lifecycle. Service validates transitions by checking current state.' },
      { name: 'Value Object', description: 'CartItem is an immutable-like value object with auto-computed totalPrice on quantity/price change.' },
    ],
    solid: [
      { principle: 'S — Single Responsibility', description: 'Product owns product data, CartItem owns line-item data, Cart owns cart state, Order owns order state, Service owns business rules.' },
      { principle: 'O — Open/Closed', description: 'New OrderStatus values (e.g., RETURNED) can be added without changing existing transitions. New product categories are trivially added.' },
      { principle: 'L — Liskov Substitution', description: 'Repository returns standard List/Map interfaces. Any implementation (in-memory, JPA) works interchangeably.' },
      { principle: 'I — Interface Segregation', description: 'Service exposes focused methods (addToCart, removeFromCart, updateQuantity, checkout) rather than a generic execute() method.' },
      { principle: 'D — Dependency Inversion', description: 'Controller depends on ShoppingCartService interface. Spring DI handles implementation injection.' },
    ],
    oop: [
      { name: 'Encapsulation', description: 'Cart hides its items map behind getItems(). Items cannot be modified without going through service methods that enforce business rules.' },
      { name: 'Inheritance', description: 'All model classes extend Object. OrderStatus is an enum inheriting Enum behaviors.' },
      { name: 'Polymorphism', description: 'Cart.recalculateTotal() works regardless of how many items or what types of products are in the cart.' },
      { name: 'Abstraction', description: 'CartItem abstracts the concept of a product+quantity+price combo regardless of which product it represents.' },
    ],
    extensibility: [
      {
        area: 'Discounts & Coupons',
        description: 'Add DiscountStrategy interface (PercentageDiscount, FlatDiscount, BuyOneGetOne). Apply during checkout before order creation.',
        difficulty: 'Medium',
      },
      {
        area: 'Payment Integration',
        description: 'Add PaymentService interface. Call processPayment() during checkout. Order status transitions to CONFIRMED only on payment success.',
        difficulty: 'Medium',
      },
      {
        area: 'Multiple Cart Support',
        description: 'Allow multiple carts per user (wishlist, saved-for-later). Cart already supports userId field — extend with cart name and saved status.',
        difficulty: 'Easy',
      },
      {
        area: 'Database Persistence',
        description: 'Implement ShoppingCartJpaRepository. Swap via Spring @Profile. Service layer unchanged thanks to Dependency Injection.',
        difficulty: 'Medium',
      },
      {
        area: 'Inventory Integration',
        description: 'On checkout, call InventoryService.updateStock() for each product to reduce available quantity. Prevents overselling.',
        difficulty: 'Medium',
      },
    ],
  },
  loggingFramework: {
    title: 'Logging Framework — Design Details',
    requirements: [
      'Support multiple log levels: DEBUG, INFO, WARN, ERROR, FATAL — each level has a numeric rank for comparison filtering',
      'Multiple appender types: ConsoleAppender, FileAppender, DatabaseAppender — each writes formatted log messages to a different destination',
      'Configurable log level per logger — fine-grained control with hierarchical parent-child level inheritance',
      'Thread-safe logging — concurrent log calls from multiple threads must not interleave or corrupt output messages',
      'Customizable message formatting with timestamp, level, logger name, thread name, and message text per appender',
      'Logger hierarchy — child loggers inherit parent configuration unless explicitly overridden',
      'Asynchronous logging support — queue log events and process them on a background thread to reduce main-thread latency',
    ],
    entities: [
      {
        name: 'Logger',
        description: 'Provides log methods (debug, info, warn, error, fatal). Checks effective level before dispatching LogEvent to all registered appenders.',
        fields: [
          { name: 'name', type: 'String', description: 'Fully qualified class name used as logger identifier' },
          { name: 'level', type: 'LogLevel', description: 'Effective log level (own or inherited from parent)' },
          { name: 'parent', type: 'Logger', description: 'Parent logger in the hierarchy for level inheritance' },
          { name: 'appenders', type: 'List<Appender>', description: 'Appenders attached to this specific logger' },
        ],
        methods: [
          { name: 'debug(message)', returns: 'void', description: 'Logs at DEBUG level if level is enabled' },
          { name: 'info(message)', returns: 'void', description: 'Logs at INFO level if level is enabled' },
          { name: 'warn(message)', returns: 'void', description: 'Logs at WARN level if level is enabled' },
          { name: 'error(message)', returns: 'void', description: 'Logs at ERROR level if level is enabled' },
        ],
      },
      {
        name: 'LogLevel',
        description: 'Enum with values DEBUG, INFO, WARN, ERROR, FATAL. Each has an integer rank for comparison. Only messages at or above the configured level are logged.',
        fields: [
          { name: 'DEBUG', type: 'int', value: '1', description: 'Fine-grained diagnostic information' },
          { name: 'INFO', type: 'int', value: '2', description: 'General operational milestones' },
          { name: 'WARN', type: 'int', value: '3', description: 'Potentially harmful situations' },
          { name: 'ERROR', type: 'int', value: '4', description: 'Error events that might still allow the app to continue' },
          { name: 'FATAL', type: 'int', value: '5', description: 'Severe errors causing premature termination' },
        ],
        methods: [
          { name: 'isGreaterOrEqual(other)', returns: 'boolean', description: 'Compares ranks for level filtering decisions' },
        ],
      },
      {
        name: 'Appender',
        description: 'Abstract interface for log output destinations. Implementations format and write LogEvent to their respective targets.',
        fields: [
          { name: 'name', type: 'String', description: 'Unique appender identifier' },
          { name: 'layout', type: 'Layout', description: 'Formats LogEvent into a string before writing' },
        ],
        methods: [
          { name: 'append(event)', returns: 'void', description: 'Formats and writes the log event to the target' },
        ],
      },
      {
        name: 'LoggingFramework',
        description: 'Singleton that manages global configuration: root log level, registered appenders, and logger factory.',
        fields: [
          { name: 'instance', type: 'LoggingFramework', description: 'Static singleton instance' },
          { name: 'rootLogger', type: 'Logger', description: 'Root logger — parent of all loggers in the hierarchy' },
          { name: 'appenders', type: 'List<Appender>', description: 'Global appenders inherited by all loggers' },
        ],
        methods: [
          { name: 'getInstance()', returns: 'LoggingFramework', description: 'Returns the singleton instance (thread-safe lazy init)' },
          { name: 'getLogger(name)', returns: 'Logger', description: 'Returns or creates a logger with the given name' },
          { name: 'addAppender(appender)', returns: 'void', description: 'Registers a global appender' },
        ],
      },
      {
        name: 'LogEvent',
        description: 'Immutable value object representing a single log occurrence. Carries all context: timestamp, level, message, thread, logger.',
        fields: [
          { name: 'timestamp', type: 'long', description: 'Epoch millis when the log call occurred' },
          { name: 'level', type: 'LogLevel', description: 'Severity level of this event' },
          { name: 'loggerName', type: 'String', description: 'Name of the source logger' },
          { name: 'message', type: 'String', description: 'Formatted log message' },
          { name: 'threadName', type: 'String', description: 'Thread that triggered the log' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      { name: 'Singleton', used: true, explanation: 'LoggingFramework is a singleton ensuring a single global configuration and appender registry. Multiple instances would lead to duplicate logging and configuration inconsistency.' },
      { name: 'Factory', used: true, explanation: 'LoggerFactory creates and caches Logger instances. Clients request loggers by class name without knowing creation details. The factory also sets up the parent-child hierarchy automatically.' },
      { name: 'Strategy', used: true, explanation: 'Appender is a strategy interface. ConsoleAppender, FileAppender, DatabaseAppender each implement the append() method differently. The Logger dispatches to all appenders without knowing their types.' },
      { name: 'Observer', used: false, explanation: 'Could be used to notify external monitoring systems when ERROR/FATAL events occur. The framework would maintain a list of alert listeners notified on severe log events.' },
      { name: 'Decorator', used: false, explanation: 'Could wrap appenders with additional behavior — AsyncAppenderDecorator queues events, CompressionDecorator compresses output, RetryDecorator retries on failure.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Logger handles level checking and event creation. Appender handles output. LogEvent is a data carrier. LoggingFramework handles configuration. Each has one clear responsibility.' },
      { name: 'Open/Closed (OCP)', description: 'New appenders (Kafka, CloudWatch, Slack) can be added by implementing the Appender interface. New layouts can be added similarly. The Logger and existing appenders remain unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'Logger depends on Appender interface, not concrete implementations. High-level logging code does not depend on low-level output mechanisms. Concrete appenders are injected via configuration.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Level comparison logic is in LogLevel enum. Message formatting is in Layout classes. Thread/logger context is captured once in LogEvent. No duplication across log calls or appenders.' },
      { name: 'KISS (Keep It Simple)', description: 'The core pipeline is straightforward: Logger creates LogEvent, dispatches to Appenders, each Appender formats and writes. No complex routing or conditional chains.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Appender Interface', description: 'Logger calls append() on the Appender interface without knowing the concrete type. ConsoleAppender, FileAppender, and DatabaseAppender each implement the method differently.', alternative: 'Could use a single monolithic LogWriter with if-else for each type. Interface-based polymorphism allows unlimited new appender types without modifying existing code.' },
      { name: 'Composition over Inheritance', description: 'Logger has-a List of Appender, not is-a Appender. LoggingFramework has-a root Logger and List of Appender. Behavior is assembled, not inherited.', alternative: 'Could use inheritance for specialized loggers. Composition is chosen because loggers differ in configuration, not behavior — inheritance would force a rigid hierarchy.' },
      { name: 'Encapsulation — Level Inheritance', description: 'The parent-child logger hierarchy and level resolution logic are internal. External code cannot manipulate the hierarchy directly — only through the framework API.', alternative: 'Could expose parent references publicly. Encapsulation prevents accidental hierarchy corruption and allows changing resolution logic without affecting clients.' },
    ],
    extensibility: [
      { area: 'New Appender Type', description: 'Implement the Appender interface (e.g., KafkaAppender, SlackAppender). Register with the LoggingFramework. No changes to Logger or existing appenders.', difficulty: 'Easy' },
      { area: 'Async Logging', description: 'Create AsyncAppenderDecorator wrapping a sync appender. Queues LogEvents and flushes on a background thread. Reduces main-thread blocking during log writes.', difficulty: 'Medium' },
      { area: 'Structured JSON Output', description: 'Add JsonLayout implementing Layout interface. Outputs logs as JSON objects for log aggregation systems (ELK, Datadog). Plug into any appender via configuration.', difficulty: 'Easy' },
      { area: 'Dynamic Config Reload', description: 'Watch configuration file for changes. Update log levels and appenders at runtime via LoggingFramework API without application restart.', difficulty: 'Medium' },
    ],
  },

  trafficSignal: {
    title: 'Traffic Signal — Design Details',
    requirements: [
      'Traffic intersection with multiple roads — each road has a traffic light with RED, YELLOW, GREEN states',
      'Signal timing configuration — configurable duration for each light state per road',
      'Automatic state cycling: RED to GREEN to YELLOW to RED with configurable durations per state',
      'Emergency override — traffic controller can manually set all signals to RED for emergency vehicle passage',
      'Pedestrian crossing integration — pedestrian button triggers signal change with walk/don\'t-walk indicators',
      'Multiple intersection support — system can manage several independent intersections each with its own configuration',
      'Concurrent road coordination — when one road turns GREEN, the crossing road turns RED to prevent collisions',
    ],
    entities: [
      {
        name: 'TrafficController',
        description: 'Central coordinator managing all intersections. Provides manual override for emergencies and handles system-wide commands like rush-hour mode.',
        fields: [
          { name: 'intersections', type: 'Map<String, Intersection>', description: 'All managed intersections indexed by ID' },
          { name: 'emergencyMode', type: 'boolean', description: 'When true, all signals are forced to RED for emergency vehicles' },
        ],
        methods: [
          { name: 'startIntersection(id)', returns: 'void', description: 'Begins the signal cycling for a specific intersection' },
          { name: 'emergencyOverride()', returns: 'void', description: 'Sets all signals to RED for emergency vehicle passage' },
          { name: 'releaseOverride()', returns: 'void', description: 'Restores normal signal operation after emergency' },
        ],
      },
      {
        name: 'Intersection',
        description: 'Represents a single road intersection with multiple approach roads. Coordinates signal timing so conflicting roads never have GREEN simultaneously.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique intersection identifier' },
          { name: 'roads', type: 'List<Road>', description: 'All approach roads at this intersection' },
          { name: 'currentPhase', type: 'int', description: 'Index of the currently active road phase' },
          { name: 'timer', type: 'ScheduledExecutorService', description: 'Manages state transition scheduling' },
        ],
        methods: [
          { name: 'startCycle()', returns: 'void', description: 'Begins the signal cycling sequence' },
          { name: 'transitionNext()', returns: 'void', description: 'Advances to the next road GREEN phase' },
          { name: 'emergencyStop()', returns: 'void', description: 'Halts all cycling and sets all signals to RED' },
        ],
      },
      {
        name: 'Road',
        description: 'An approach road to the intersection. Has its own traffic signal and knows the crossing road(s) for conflict detection.',
        fields: [
          { name: 'name', type: 'String', description: 'Road name (e.g., Main Street, 5th Avenue)' },
          { name: 'signal', type: 'TrafficSignal', description: 'The traffic light controlling this road' },
          { name: 'crossingRoads', type: 'List<Road>', description: 'Roads that intersect with this one — must not share GREEN' },
        ],
        methods: [
          { name: 'changeSignal(state)', returns: 'void', description: 'Changes this road\'s signal to the given state' },
          { name: 'conflictsWith(other)', returns: 'boolean', description: 'Checks if another road crosses this one' },
        ],
      },
      {
        name: 'TrafficSignal',
        description: 'Individual traffic light with RED, YELLOW, GREEN states. Maintains current state and configured durations for each state.',
        fields: [
          { name: 'currentState', type: 'SignalState', description: 'Current light state: RED, YELLOW, or GREEN' },
          { name: 'durations', type: 'Map<SignalState, Integer>', description: 'Time in seconds for each state' },
        ],
        methods: [
          { name: 'setState(state)', returns: 'void', description: 'Transitions the signal to the specified state' },
          { name: 'getState()', returns: 'SignalState', description: 'Returns current light state' },
        ],
      },
      {
        name: 'SignalState',
        description: 'Enum for traffic light states: RED (stop), YELLOW (caution/transition), GREEN (go). Determines vehicle and pedestrian behavior.',
        fields: [
          { name: 'RED', type: 'enum', description: 'Vehicles must stop — crossing road has GREEN or YELLOW' },
          { name: 'YELLOW', type: 'enum', description: 'Transition state — caution, about to turn RED' },
          { name: 'GREEN', type: 'enum', description: 'Vehicles may proceed — crossing road is RED' },
        ],
        methods: [
          { name: 'nextState()', returns: 'SignalState', description: 'Returns the next state in the cycle: RED to GREEN to YELLOW to RED' },
        ],
      },
    ],
    designPatterns: [
      { name: 'State', used: true, explanation: 'TrafficSignal uses the State pattern via SignalState enum. Each state (RED, YELLOW, GREEN) defines behavior and valid next transition. Adding FLASHING state only requires a new enum constant.' },
      { name: 'Singleton', used: true, explanation: 'TrafficController is a singleton managing all intersections. A single controller ensures coordinated emergency overrides and consistent system-wide configuration.' },
      { name: 'Observer', used: false, explanation: 'Pedestrian crossing buttons act as observers watching for the walk signal. Emergency vehicles could notify the controller to trigger override. Currently handled via direct controller calls.' },
      { name: 'Strategy', used: false, explanation: 'Signal timing strategies (MorningRushStrategy, NightStrategy, WeekendStrategy) could replace fixed durations. Intersection would delegate timing to a TimingStrategy without changing core cycle logic.' },
      { name: 'Command', used: false, explanation: 'Emergency override, pedestrian crossing, and manual mode could be encapsulated as Command objects. Enables undo/redo, scheduling, and logging of signal changes.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'TrafficController handles coordination. Intersection manages phase sequencing. Road owns its signal and knows conflicts. TrafficSignal maintains state and timing. Each has one reason to change.' },
      { name: 'Open/Closed (OCP)', description: 'New road types, signal timing strategies, or intersection topologies can be added by extending interfaces. Core cycle logic is closed for modification but open for extension.' },
      { name: 'Dependency Inversion (DIP)', description: 'Intersection depends on Road and TrafficSignal abstractions, not concrete implementations. Timing mechanism uses an interface for different scheduling backends.' },
      { name: 'Encapsulation', description: 'TrafficSignal hides state transition rules. Intersection hides phase coordination logic. Roads cannot directly change other roads\' signals — coordination goes through the Intersection.' },
      { name: 'KISS (Keep It Simple)', description: 'The RED to GREEN to YELLOW cycle is a straightforward state machine. Modeling it as one keeps implementation simple and verifiable.' },
    ],
    oopConcepts: [
      { name: 'State Pattern via Enum', description: 'SignalState enum drives all signal behavior. Each state knows its valid transition. TrafficSignal simply delegates to current state, avoiding complex if-else chains.', alternative: 'Could use boolean flags (isRed, isGreen). Enum-based state makes invalid states (both GREEN and RED) unrepresentable.' },
      { name: 'Composition over Inheritance', description: 'Intersection has-a List of Road. Road has-a TrafficSignal. TrafficSignal has-a SignalState. The system is built by composing objects.', alternative: 'Could extend a BaseIntersection class. Composition is chosen because intersections vary in road count and layout.' },
      { name: 'Encapsulation — Conflict Prevention', description: 'The Intersection encapsulates phase coordination. Roads cannot independently turn GREEN — every transition is validated by the Intersection to prevent conflicting signals.', alternative: 'Could let each road manage its own signal. Centralized coordination guarantees safety invariants at the architectural level.' },
    ],
    extensibility: [
      { area: 'New Signal State', description: 'Add FLASHING or LEFT_TURN_ARROW state to SignalState enum. Define duration and next transition. Existing states remain unchanged.', difficulty: 'Easy' },
      { area: 'Adaptive Traffic Timing', description: 'Add sensors to detect vehicle density. Implement AdaptiveTimingStrategy that adjusts GREEN durations based on real-time traffic volume.', difficulty: 'Hard' },
      { area: 'Pedestrian Crossing', description: 'Add PedestrianButton as an observer. When pressed, Intersection schedules a pedestrian walk interval during the next appropriate cycle.', difficulty: 'Medium' },
      { area: 'Connected Vehicle Integration', description: 'Add CommunicationModule that broadcasts signal states to approaching vehicles via V2I. Vehicles receive GREEN timing for optimal speed advice.', difficulty: 'Hard' },
    ],
  },

  taskManagement: {
    title: 'Task Management — Design Details',
    requirements: [
      'Users can create, update, delete, and view tasks — each task has title, description, priority, status, and due date',
      'Task status workflow: TODO to IN_PROGRESS to REVIEW to DONE — with optional BLOCKED state from any active state',
      'Task priorities: LOW, MEDIUM, HIGH, CRITICAL — tasks can be filtered and sorted by priority',
      'Users can assign tasks to other users and comment on tasks for collaboration',
      'Task board view — tasks organized in columns by status (Kanban-style) with drag-and-drop status changes',
      'Activity log — all task changes (status updates, assignments, comments) are recorded with timestamps and user info',
      'Notifications — users receive updates when tasks assigned to them are modified or when comments are added',
    ],
    entities: [
      {
        name: 'User',
        description: 'System user who can create, assign, and work on tasks. Has a dashboard showing assigned tasks and activity feed.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique user identifier' },
          { name: 'name', type: 'String', description: 'Display name of the user' },
          { name: 'email', type: 'String', description: 'Email for notifications' },
          { name: 'assignedTasks', type: 'List<Task>', description: 'Tasks currently assigned to this user' },
        ],
        methods: [
          { name: 'createTask(details)', returns: 'Task', description: 'Creates a new task owned by this user' },
          { name: 'changeStatus(task, newStatus)', returns: 'void', description: 'Updates task status if the transition is valid' },
          { name: 'addComment(task, text)', returns: 'Comment', description: 'Adds a comment to the given task' },
        ],
      },
      {
        name: 'Task',
        description: 'Core entity representing a unit of work. Has status, priority, assignee, comments, and activity log.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique task identifier' },
          { name: 'title', type: 'String', description: 'Short task summary' },
          { name: 'description', type: 'String', description: 'Detailed task description' },
          { name: 'status', type: 'TaskStatus', description: 'TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED' },
          { name: 'priority', type: 'Priority', description: 'LOW, MEDIUM, HIGH, CRITICAL' },
          { name: 'assignee', type: 'User', description: 'User responsible for completing this task' },
          { name: 'dueDate', type: 'LocalDate', description: 'Deadline for task completion' },
          { name: 'comments', type: 'List<Comment>', description: 'Discussion thread on this task' },
        ],
        methods: [
          { name: 'changeStatus(newStatus)', returns: 'boolean', description: 'Transitions to new status if the state machine allows it' },
          { name: 'assignTo(user)', returns: 'void', description: 'Reassigns the task to another user' },
          { name: 'addComment(comment)', returns: 'void', description: 'Appends a comment to the task' },
        ],
      },
      {
        name: 'TaskBoard',
        description: 'Kanban-style board that groups tasks by status column. Provides drag-and-drop status updates and filtering.',
        fields: [
          { name: 'columns', type: 'Map<TaskStatus, List<Task>>', description: 'Tasks grouped by their current status' },
          { name: 'filters', type: 'FilterCriteria', description: 'Active filters (priority, assignee, date range)' },
        ],
        methods: [
          { name: 'moveTask(taskId, targetStatus)', returns: 'void', description: 'Moves task between columns with status validation' },
          { name: 'getFilteredTasks()', returns: 'List<Task>', description: 'Returns tasks matching active filters' },
        ],
      },
      {
        name: 'ActivityLog',
        description: 'Immutable record of all task state changes. Provides an audit trail for compliance and historical view.',
        fields: [
          { name: 'entries', type: 'List<ActivityEntry>', description: 'Chronological list of all changes' },
        ],
        methods: [
          { name: 'logChange(taskId, user, action, details)', returns: 'void', description: 'Records a new activity entry' },
          { name: 'getHistory(taskId)', returns: 'List<ActivityEntry>', description: 'Returns all changes for a specific task' },
        ],
      },
      {
        name: 'NotificationService',
        description: 'Manages user notifications for task assignments, status changes, and comments. Supports email and in-app notification delivery.',
        fields: [
          { name: 'observers', type: 'Map<String, List<User>>', description: 'Users subscribed to notifications per task' },
        ],
        methods: [
          { name: 'subscribe(user, taskId)', returns: 'void', description: 'Subscribes user to task notifications' },
          { name: 'notify(taskId, event)', returns: 'void', description: 'Sends notification to all subscribers of the task' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'NotificationService acts as the subject. When a task changes, it notifies all subscribed observers (users). Users receive updates without the Task class knowing about notification delivery.' },
      { name: 'State', used: true, explanation: 'TaskStatus enum with valid transition rules implements the State pattern. BLOCKED can be entered from any active state, DONE is terminal. Invalid transitions are rejected by the state machine.' },
      { name: 'Singleton', used: true, explanation: 'TaskManagementService and NotificationService are singletons ensuring consistent state. A single board service prevents conflicting task modifications across the system.' },
      { name: 'Strategy', used: false, explanation: 'Task prioritization strategies (EarliestDeadlineFirst, HighestPriorityFirst) could be used for auto-sorting the board. Each strategy would implement a Comparator without changing board logic.' },
      { name: 'Factory', used: false, explanation: 'A TaskFactory could create pre-configured tasks for common templates (BugTask, FeatureTask, ChoreTask) with default priorities and status workflows.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Task manages its own state and data. TaskBoard handles display and filtering. ActivityLog records changes. NotificationService sends alerts. Each has one clear responsibility.' },
      { name: 'Open/Closed (OCP)', description: 'New task statuses can be added to TaskStatus enum with defined transitions. New notification channels (Slack, SMS) implement NotificationChannel interface. Core task workflow unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'TaskBoard depends on Task and TaskStatus abstractions. NotificationService depends on NotificationChannel interface. High-level modules don\'t depend on low-level details.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Status transition validation is centralized in TaskStatus enum. Comment creation logic is in CommentService. Activity logging is automatic, not manually coded per action.' },
      { name: 'KISS (Keep It Simple)', description: 'The Kanban model is intuitive: columns = statuses. Moving a task is changing its status. State machine has clear, simple transition rules. No complex workflow engine needed.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Status Behavior', description: 'TaskStatus enum drives different behaviors: DONE tasks cannot be edited, BLOCKED tasks appear in a warning column. Same status field produces different behavior polymorphically.', alternative: 'Could use boolean flags (isDone, isBlocked). Enum makes invalid states (both DONE and IN_PROGRESS) unrepresentable.' },
      { name: 'Composition over Inheritance', description: 'TaskBoard has-a Map of Task lists. User has-a List of Task. Task has-a List of Comment. System composes behaviors rather than inheriting from a base entity.', alternative: 'Could extend a BaseEntity for all domain objects. Composition is chosen because relationships are structural, not behavioral.' },
      { name: 'Encapsulation — Status Transitions', description: 'Task encapsulates its status and only exposes changeStatus() which validates the transition. External code cannot directly set the status field, preventing illegal state changes.', alternative: 'Could expose a setStatus() setter. Encapsulated transitions enforce business rules at the model level.' },
    ],
    extensibility: [
      { area: 'New Task Status', description: 'Add a new constant to TaskStatus enum. Define valid incoming and outgoing transitions. Existing state machine handles new status automatically.', difficulty: 'Easy' },
      { area: 'Sprint/Agile Support', description: 'Add Sprint entity with start/end dates. Group tasks into sprints. Add SprintBoard as a view filtering tasks by sprint. Existing task and board models unchanged.', difficulty: 'Medium' },
      { area: 'File Attachments', description: 'Add Attachment entity linked to Task. File upload handled by AttachmentService. Existing task fields and workflow unchanged.', difficulty: 'Medium' },
      { area: 'Recurring Tasks', description: 'Add recurrence rules to Task. A ScheduledTaskService creates new task instances based on recurrence when previous instance is completed.', difficulty: 'Medium' },
    ],
  },

  linkedin: {
    title: 'LinkedIn — Design Details',
    requirements: [
      'User profiles with professional information: experience, education, skills, recommendations, and profile photo',
      'Connection management — users can send, accept, reject connection requests with 1st/2nd/3rd degree connection visibility',
      'Feed with personalized content — posts from connections, suggested posts, sponsored content ranked by relevance and recency',
      'Post creation with text, images, and video — other users can like, comment, and share posts',
      'Notifications for connection requests, post likes, comments, shares, and profile views',
      'Search functionality — search for people, jobs, companies, and posts with filtering and sorting',
      'Messaging system — real-time chat between connected users with typing indicators and read receipts',
      'Job posting and applications — companies can post jobs, users can apply with their profile',
    ],
    entities: [
      {
        name: 'User',
        description: 'Core member entity with professional profile. Manages connections, posts, notifications, and privacy settings.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique user identifier' },
          { name: 'profile', type: 'Profile', description: 'Professional profile with experience, education, skills' },
          { name: 'connections', type: 'List<Connection>', description: 'All accepted connections with metadata' },
          { name: 'privacySettings', type: 'PrivacySettings', description: 'Profile visibility, connection request preferences' },
        ],
        methods: [
          { name: 'sendConnectionRequest(targetUser)', returns: 'ConnectionRequest', description: 'Initiates a connection request to another user' },
          { name: 'acceptRequest(request)', returns: 'Connection', description: 'Accepts a pending connection request' },
          { name: 'createPost(content)', returns: 'Post', description: 'Creates a new post on the user\'s feed' },
          { name: 'search(query, filters)', returns: 'SearchResults', description: 'Searches people, jobs, companies' },
        ],
      },
      {
        name: 'Profile',
        description: 'Professional profile containing work history, education, skills, achievements, and recommendations.',
        fields: [
          { name: 'headline', type: 'String', description: 'Professional headline (e.g., Software Engineer at Google)' },
          { name: 'experiences', type: 'List<Experience>', description: 'Work history with companies, roles, dates' },
          { name: 'education', type: 'List<Education>', description: 'Academic background with degrees and institutions' },
          { name: 'skills', type: 'List<Skill>', description: 'Professional skills with endorsements' },
          { name: 'recommendations', type: 'List<Recommendation>', description: 'Peer recommendations with text and author' },
        ],
        methods: [
          { name: 'addExperience(exp)', returns: 'void', description: 'Adds a new work experience entry' },
          { name: 'addSkill(skill)', returns: 'void', description: 'Adds a skill to the profile' },
          { name: 'endorseSkill(skill, endorser)', returns: 'void', description: 'Increments endorsement count for a skill' },
        ],
      },
      {
        name: 'Connection',
        description: 'Represents an accepted bidirectional connection between two users. Stores metadata like connected date and interaction strength.',
        fields: [
          { name: 'user1', type: 'User', description: 'First user in the connection' },
          { name: 'user2', type: 'User', description: 'Second user in the connection' },
          { name: 'connectedAt', type: 'LocalDateTime', description: 'When the connection was established' },
          { name: 'interactionScore', type: 'double', description: 'Feed ranking signal based on mutual interactions' },
        ],
        methods: [
          { name: 'getConnectionDegree(currentUser)', returns: 'int', description: 'Returns 1st, 2nd, or 3rd degree from the given user' },
        ],
      },
      {
        name: 'Post',
        description: 'User-generated content with text, media attachments. Supports likes, comments, and shares with engagement tracking.',
        fields: [
          { name: 'author', type: 'User', description: 'User who created the post' },
          { name: 'content', type: 'Content', description: 'Post body with text and optional media' },
          { name: 'likes', type: 'Set<User>', description: 'Users who liked this post' },
          { name: 'comments', type: 'List<Comment>', description: 'User comments on this post' },
          { name: 'shares', type: 'int', description: 'Number of times the post was shared' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the post was created' },
        ],
        methods: [
          { name: 'addLike(user)', returns: 'void', description: 'Records a like from the specified user' },
          { name: 'addComment(user, text)', returns: 'Comment', description: 'Adds a comment to this post' },
          { name: 'share(user)', returns: 'Post', description: 'Creates a reshare of this post by the given user' },
        ],
      },
      {
        name: 'FeedService',
        description: 'Generates personalized feed for each user. Ranks posts by relevance based on connection strength, engagement, recency, and content type.',
        fields: [
          { name: 'rankingStrategy', type: 'FeedRankingStrategy', description: 'Algorithm for ordering feed posts' },
        ],
        methods: [
          { name: 'getFeed(user, page, size)', returns: 'List<Post>', description: 'Returns paginated personalized feed for the user' },
          { name: 'rankPosts(posts, user)', returns: 'List<Post>', description: 'Ranks posts by relevance score for the given user' },
        ],
      },
      {
        name: 'NotificationService',
        description: 'Manages all user notifications. Supports in-app notifications, email digests, and push notifications with preference controls.',
        fields: [
          { name: 'topics', type: 'Map<String, List<NotificationListener>>', description: 'Subscribers per notification type' },
        ],
        methods: [
          { name: 'notify(event)', returns: 'void', description: 'Dispatches notification to all relevant subscribers' },
          { name: 'getNotifications(user)', returns: 'List<Notification>', description: 'Returns unread notifications for the user' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'NotificationService uses the Observer pattern. When a user likes a post or sends a connection request, all relevant parties are notified without the originating service knowing about notification logic.' },
      { name: 'Factory', used: true, explanation: 'PostFactory creates different post types (TextPost, ImagePost, VideoPost, ArticlePost). Each has different rendering and interaction behaviors. Feed treats all posts uniformly through the Post interface.' },
      { name: 'Singleton', used: true, explanation: 'FeedService, NotificationService, and ConnectionService are singletons ensuring consistent data access and preventing duplicate notifications.' },
      { name: 'Strategy', used: true, explanation: 'FeedRankingStrategy interface with implementations: RelevanceRanking (engagement-based), RecencyRanking (time-based), HybridRanking (combined). FeedService delegates to the configured strategy.' },
      { name: 'Proxy', used: false, explanation: 'A ProfileProxy could control visibility based on connection degree. 2nd-degree connections see limited profile info, 3rd-degree see only name and headline.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'User manages identity and connections. Profile holds professional data. FeedService handles ranking. NotificationService manages alerts. Post handles engagement. Each has one job.' },
      { name: 'Open/Closed (OCP)', description: 'New post types implement Post interface. New feed strategies implement FeedRankingStrategy. New notification channels implement NotificationChannel. Core classes unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'FeedService depends on FeedRankingStrategy abstraction. NotificationService depends on NotificationChannel interface. High-level services don\'t depend on low-level implementations.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Connection degree calculation is centralized in Connection. Notification dispatch is in NotificationService. Feed ranking is in one strategy class per algorithm.' },
      { name: 'Liskov Substitution (LSP)', description: 'Any FeedRankingStrategy can replace another without breaking FeedService. Post subtypes are fully substitutable where Post is expected.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Post Types', description: 'Feed renders posts polymorphically. TextPost, ImagePost, VideoPost each implement render() differently. Feed code calls render() on Post interface without knowing concrete type.', alternative: 'Could use a single Post class with type field and if-else rendering. Polymorphism allows adding new post types without modifying feed code.' },
      { name: 'Composition over Inheritance', description: 'User has-a Profile, List of Connection, List of Post. Profile has-a List of Experience, List of Education. System composes fine-grained entities rather than deep hierarchies.', alternative: 'Could create RichUser extending User. Composition is chosen because profile sections vary independently and can be reused.' },
      { name: 'Encapsulation — Privacy Controls', description: 'User encapsulates privacy settings. Profile visibility queries go through the User\'s access control methods. External code cannot bypass privacy checks.', alternative: 'Could rely on frontend-only access control. Backend-enforced encapsulation provides security at the data layer.' },
    ],
    extensibility: [
      { area: 'New Post Type', description: 'Create a new class implementing Post interface (PollPost, EventPost). Add factory mapping. Existing feed rendering and interaction code works unchanged.', difficulty: 'Easy' },
      { area: 'Feed Algorithm Change', description: 'Implement new FeedRankingStrategy (ML-based ranking using user embeddings). Swap via configuration. No changes to FeedService or other components.', difficulty: 'Medium' },
      { area: 'Groups/Communities', description: 'Add Group entity with members, posts, and admins. GroupFeedService extends feed concepts to group context. Reuses existing Post, Comment, and Notification models.', difficulty: 'Medium' },
      { area: 'End-to-End Encryption for Messages', description: 'Implement E2E encryption in messaging service. Messages encrypted client-side. Message entity stores encrypted content. Backend never sees plaintext.', difficulty: 'Hard' },
    ],
  },

  lruCache: {
    title: 'LRU Cache — Design Details',
    requirements: [
      'Fixed-capacity cache with configurable maximum size — evicts least recently used entries when capacity is reached',
      'O(1) get(key) operation — returns value if present, moves accessed item to most-recently-used position, returns null if absent',
      'O(1) put(key, value) operation — inserts or updates entry, evicts LRU entry if at capacity, moves updated entry to MRU position',
      'Thread-safe operations — concurrent reads and writes must not corrupt internal data structures or return stale values',
      'Eviction callback — optional listener notified when an entry is evicted (useful for cleanup or cache coherency)',
      'Cache statistics — hit count, miss count, hit rate, eviction count for performance monitoring',
      'TTL support — entries can expire after a configurable time-to-live, evicted on access if expired',
    ],
    entities: [
      {
        name: 'LRUCache',
        description: 'Main cache class providing get/put/remove API. Combines HashMap for O(1) lookup with DoublyLinkedList for LRU ordering.',
        fields: [
          { name: 'capacity', type: 'int', description: 'Maximum number of entries before eviction' },
          { name: 'cache', type: 'Map<K, Node<K, V>>', description: 'HashMap for O(1) key-to-node lookup' },
          { name: 'list', type: 'DoublyLinkedList<K, V>', description: 'Maintains access order — MRU at head, LRU at tail' },
          { name: 'lock', type: 'ReentrantReadWriteLock', description: 'Fine-grained locking for concurrent access' },
          { name: 'stats', type: 'CacheStats', description: 'Hit/miss/eviction counters for monitoring' },
        ],
        methods: [
          { name: 'get(key)', returns: 'V', description: 'Returns value and moves node to MRU position. Returns null if absent. O(1)' },
          { name: 'put(key, value)', returns: 'V', description: 'Updates or inserts entry. Evicts LRU if at capacity. O(1)' },
          { name: 'remove(key)', returns: 'V', description: 'Removes entry from cache and returns its value. O(1)' },
          { name: 'clear()', returns: 'void', description: 'Empties the entire cache' },
          { name: 'size()', returns: 'int', description: 'Current number of entries in cache' },
        ],
      },
      {
        name: 'Node',
        description: 'Doubly-linked list node wrapping the key-value pair. Maintains prev/next pointers for O(1) list operations.',
        fields: [
          { name: 'key', type: 'K', description: 'Cache key — also stored in node for O(1) removal from map' },
          { name: 'value', type: 'V', description: 'Cached value' },
          { name: 'prev', type: 'Node<K, V>', description: 'Pointer to previous node (closer to LRU)' },
          { name: 'next', type: 'Node<K, V>', description: 'Pointer to next node (closer to MRU)' },
          { name: 'expiryTime', type: 'long', description: 'Epoch millis when this entry expires (for TTL support)' },
        ],
        methods: [
          { name: 'isExpired()', returns: 'boolean', description: 'Checks if current time exceeds expiryTime' },
        ],
      },
      {
        name: 'DoublyLinkedList',
        description: 'Custom linked list with dummy head/tail for O(1) add-to-front, remove-from-back, and arbitrary node removal.',
        fields: [
          { name: 'head', type: 'Node<K, V>', description: 'Dummy head node (sentinel) — MRU end' },
          { name: 'tail', type: 'Node<K, V>', description: 'Dummy tail node (sentinel) — LRU end' },
          { name: 'size', type: 'int', description: 'Current number of nodes in the list' },
        ],
        methods: [
          { name: 'addToFront(node)', returns: 'void', description: 'Inserts node right after head — marks as MRU. O(1)' },
          { name: 'removeNode(node)', returns: 'void', description: 'Removes arbitrary node by rewiring prev/next. O(1)' },
          { name: 'removeLast()', returns: 'Node<K, V>', description: 'Removes and returns the LRU node (just before tail). O(1)' },
        ],
      },
      {
        name: 'EvictionListener',
        description: 'Callback interface notified when entries are evicted. Useful for cleanup of associated resources or distributed cache coherency.',
        fields: [],
        methods: [
          { name: 'onEvict(key, value)', returns: 'void', description: 'Called when an entry is evicted from the cache' },
        ],
      },
      {
        name: 'CacheStats',
        description: 'Immutable statistics snapshot. Tracks cache performance for monitoring and tuning.',
        fields: [
          { name: 'hitCount', type: 'long', description: 'Number of successful get() calls' },
          { name: 'missCount', type: 'long', description: 'Number of failed get() calls' },
          { name: 'evictionCount', type: 'long', description: 'Number of evicted entries' },
        ],
        methods: [
          { name: 'hitRate()', returns: 'double', description: 'Returns hitCount / (hitCount + missCount)' },
          { name: 'incrementHits()', returns: 'void', description: 'Atomically increments hit counter' },
          { name: 'incrementMisses()', returns: 'void', description: 'Atomically increments miss counter' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Singleton', used: true, explanation: 'Cache instances are singletons per configuration (one cache per named region). Ensures all consumers share the same cached data and eviction state.' },
      { name: 'Strategy', used: true, explanation: 'EvictionPolicy interface with implementations: LRUEvictionPolicy, LFUEvictionPolicy, FIFOEvictionPolicy, TTLEvictionPolicy. Cache delegates eviction decisions to the policy.' },
      { name: 'Factory', used: true, explanation: 'CacheFactory creates configured cache instances with desired capacity, eviction policy, and TTL. Clients don\'t need to assemble internal components manually.' },
      { name: 'Observer', used: true, explanation: 'EvictionListener is an observer pattern. When cache evicts an entry, it notifies registered listeners for cleanup or distributed invalidation.' },
      { name: 'Proxy', used: false, explanation: 'A CachingProxy could wrap a slow data source (database, remote API). The proxy checks cache first, fetches from source on miss, populates cache. Separates caching from data access logic.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'LRUCache handles public API (get/put). DoublyLinkedList manages node ordering. Node wraps key-value. EvictionPolicy decides eviction. CacheStats tracks metrics. Each has one reason to change.' },
      { name: 'Open/Closed (OCP)', description: 'New eviction policies implement EvictionPolicy interface. Cache core (HashMap + LinkedList + locking) stays unchanged. Adding LFU or FIFO requires zero changes to base cache logic.' },
      { name: 'Dependency Inversion (DIP)', description: 'LRUCache depends on EvictionPolicy and DoublyLinkedList abstractions. It doesn\'t depend on concrete eviction implementations. Factory injects the concrete policy.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Node manipulation logic (addToFront, removeNode) is centralized in DoublyLinkedList, not duplicated across get/put. Thread-safety is handled once by the ReentrantReadWriteLock.' },
      { name: 'KISS (Keep It Simple)', description: 'Classic HashMap + DoublyLinkedList is the simplest O(1) implementation. Sentinel pattern (dummy head/tail) eliminates null checks for edge cases.' },
    ],
    oopConcepts: [
      { name: 'Data Structure Composition', description: 'Cache composes HashMap (fast lookup) with DoublyLinkedList (ordering). Neither alone provides both O(1) access and LRU ordering — their composition achieves both.', alternative: 'Could use LinkedHashMap which internally combines both. Custom composition makes eviction policy pluggable.' },
      { name: 'Generics/Type Safety', description: 'LRUCache<K, V> is generic — works with any key/value types. Node class is also parameterized. Provides compile-time type safety without casting.', alternative: 'Could use Object-typed cache with casting. Generics eliminate runtime ClassCastException.' },
      { name: 'Encapsulation — Internal Structure', description: 'HashMap and DoublyLinkedList are private. External code interacts only through get/put/remove. Internal structures can change (e.g., ConcurrentHashMap) without affecting clients.', alternative: 'Could expose internals for debugging. Encapsulation allows changing implementation without breaking API contracts.' },
    ],
    extensibility: [
      { area: 'New Eviction Policy', description: 'Implement EvictionPolicy interface (LFU, FIFO, LIFO, Random). Register with CacheFactory. Core get/put O(1) operations remain unchanged.', difficulty: 'Easy' },
      { area: 'Persistent Cache', description: 'Add disk-backed storage. On put, write to both memory and disk. On startup, load entries from disk into memory. In-memory API remains the same.', difficulty: 'Medium' },
      { area: 'Distributed Cache', description: 'Wrap LRUCache in a DistributedCache using consistent hashing to partition keys across nodes. Each node runs its own LRUCache internally.', difficulty: 'Hard' },
      { area: 'Cache-aside Loading', description: 'Add load(key) method accepting a loader function. On cache miss, loader fetches value, populates cache, and returns. Single API instead of get-then-fetch.', difficulty: 'Easy' },
    ],
  },

  pubSub: {
    title: 'Pub-Sub — Design Details',
    requirements: [
      'Topic-based publish-subscribe messaging — publishers send messages to topics, subscribers receive messages from topics they subscribe to',
      'Multiple subscribers per topic — each subscriber receives every message published to the topic (fan-out)',
      'Subscriber can specify filters — receive only messages matching certain criteria (e.g., message type, content pattern)',
      'Durable subscriptions — subscriber can disconnect and later receive missed messages (persistent queue per subscriber)',
      'At-least-once delivery — messages are retried until subscriber acknowledges receipt, preventing message loss',
      'Message ordering per topic — messages are delivered to subscribers in the order they were published (FIFO per topic)',
      'Asynchronous publishing — publisher does not block while messages are being delivered to subscribers',
      'Dead letter queue — messages that cannot be delivered after max retries are moved to a DLQ for manual inspection',
    ],
    entities: [
      {
        name: 'Broker',
        description: 'Central message routing hub. Manages topics, routes messages from publishers to subscribers, and handles persistence and retry.',
        fields: [
          { name: 'topics', type: 'Map<String, Topic>', description: 'All registered topics indexed by name' },
          { name: 'executor', type: 'ExecutorService', description: 'Thread pool for async message delivery to subscribers' },
          { name: 'deadLetterQueue', type: 'Queue<Message>', description: 'Messages that exceeded max delivery retries' },
        ],
        methods: [
          { name: 'createTopic(name)', returns: 'Topic', description: 'Creates a new topic for publishing/subscribing' },
          { name: 'publish(topicName, message)', returns: 'void', description: 'Publishes a message to all subscribers of the topic' },
          { name: 'subscribe(topicName, subscriber)', returns: 'Subscription', description: 'Subscribes a consumer to receive messages from the topic' },
          { name: 'unsubscribe(subscription)', returns: 'void', description: 'Removes a subscriber from the topic' },
        ],
      },
      {
        name: 'Topic',
        description: 'Logical channel that groups related messages. Maintains subscriber list and message queue. Ensures FIFO delivery order.',
        fields: [
          { name: 'name', type: 'String', description: 'Unique topic identifier' },
          { name: 'subscribers', type: 'List<Subscription>', description: 'All active subscriptions with their filters and queues' },
          { name: 'messageQueue', type: 'Queue<Message>', description: 'Pending messages yet to be delivered' },
        ],
        methods: [
          { name: 'addSubscriber(subscription)', returns: 'void', description: 'Registers a new subscription' },
          { name: 'removeSubscriber(subId)', returns: 'void', description: 'Removes a subscription' },
          { name: 'publish(message)', returns: 'void', description: 'Enqueues message and dispatches to matching subscribers' },
        ],
      },
      {
        name: 'Subscription',
        description: 'Represents a subscriber\'s interest in a topic. Contains delivery queue, filter criteria, and retry/ack state.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique subscription identifier' },
          { name: 'subscriber', type: 'Subscriber', description: 'The consumer receiving messages' },
          { name: 'filter', type: 'MessageFilter', description: 'Optional criteria for message selection' },
          { name: 'queue', type: 'Queue<Message>', description: 'Durable queue of undelivered messages for this subscriber' },
          { name: 'retryCount', type: 'int', description: 'Number of delivery attempts for current batch' },
        ],
        methods: [
          { name: 'deliver(message)', returns: 'boolean', description: 'Attempts to deliver message to subscriber. Returns false on failure.' },
          { name: 'acknowledge(messageId)', returns: 'void', description: 'Marks message as delivered and removes from pending queue' },
          { name: 'matches(message)', returns: 'boolean', description: 'Checks if message passes the subscription filter' },
        ],
      },
      {
        name: 'Publisher',
        description: 'Entity that produces messages to topics. Publishers don\'t know about subscribers — they only publish to topics via the Broker.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique publisher identifier' },
        ],
        methods: [
          { name: 'publish(broker, topicName, message)', returns: 'void', description: 'Sends a message to the broker for distribution' },
        ],
      },
      {
        name: 'Subscriber',
        description: 'Consumer interface that receives messages from subscribed topics. Implementations define how messages are processed on receipt.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique subscriber identifier' },
          { name: 'name', type: 'String', description: 'Human-readable subscriber name' },
        ],
        methods: [
          { name: 'onMessage(message)', returns: 'void', description: 'Callback invoked when a message is delivered to this subscriber' },
          { name: 'onError(exception)', returns: 'void', description: 'Callback for delivery errors' },
        ],
      },
      {
        name: 'Message',
        description: 'Immutable data unit published to a topic. Contains payload, metadata, headers, and delivery tracking fields.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique message identifier' },
          { name: 'topic', type: 'String', description: 'Topic this message was published to' },
          { name: 'payload', type: 'Object', description: 'Actual message content (JSON, text, bytes)' },
          { name: 'timestamp', type: 'long', description: 'Epoch millis when the message was published' },
          { name: 'headers', type: 'Map<String, String>', description: 'Metadata key-value pairs for routing and filtering' },
        ],
        methods: [],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'Pub-Sub is the Observer pattern at scale. The Broker is the subject, Subscribers are observers. When a message is published, all interested subscribers are notified. Decouples producers from consumers completely.' },
      { name: 'Singleton', used: true, explanation: 'Broker is a singleton — one message hub serving all publishers and subscribers. Multiple broker instances would create isolated messaging domains requiring a federation layer.' },
      { name: 'Strategy', used: true, explanation: 'DeliveryStrategy interface with FanOutStrategy (all subscribers), FilteredStrategy (based on filters), PriorityStrategy (by priority). Broker delegates delivery logic to the strategy.' },
      { name: 'Factory', used: true, explanation: 'MessageFactory creates message instances with proper IDs, timestamps, and headers. TopicFactory creates configured topics with desired delivery strategy.' },
      { name: 'Command', used: false, explanation: 'Messages could be Command objects containing the action to execute on the subscriber. Enables queuing, scheduling, and transactional processing.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Broker routes messages. Topic manages subscribers and ordering. Subscription handles delivery, filtering, and ack. Publisher creates messages. Subscriber processes them. Each has one responsibility.' },
      { name: 'Open/Closed (OCP)', description: 'New delivery strategies implement DeliveryStrategy. New message filters implement MessageFilter. New subscriber types implement Subscriber interface. Broker and Topic remain closed.' },
      { name: 'Dependency Inversion (DIP)', description: 'Broker depends on Topic and Subscriber abstractions. Topic depends on Subscription interface. High-level routing logic doesn\'t depend on low-level consumer implementations.' },
      { name: 'Interface Segregation (ISP)', description: 'Publisher has minimal interface (publish). Subscriber has onMessage/onError. Subscription has deliver/acknowledge/matches. Each role gets only needed methods.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Message ID generation and timestamp assignment are centralized in MessageFactory. Retry logic is in Subscription — not duplicated per subscriber.' },
    ],
    oopConcepts: [
      { name: 'Composition over Inheritance', description: 'Broker has-a Map of Topic. Topic has-a List of Subscription. Subscription has-a Subscriber and MessageFilter. System built by composing fine-grained interfaces.', alternative: 'Could make Topic extend BaseTopic. Composition is chosen because topics vary in delivery strategy and durability.' },
      { name: 'Polymorphism — Subscriber Interface', description: 'Broker calls onMessage() on Subscriber interface without knowing concrete type. LoggingSubscriber, EmailSubscriber, DatabaseSubscriber each implement differently.', alternative: 'Could use callback functions. Interface-based polymorphism is chosen because subscribers often have state.' },
      { name: 'Encapsulation — Delivery Guarantees', description: 'Subscription encapsulates retry logic, ack tracking, and dead-letter handling. Other components have no visibility into another subscription\'s delivery state.', alternative: 'Could expose delivery state for monitoring. Encapsulation keeps delivery guarantees as internal concerns.' },
    ],
    extensibility: [
      { area: 'New Delivery Semantics', description: 'Implement a new DeliveryStrategy (e.g., ExactlyOnceStrategy with idempotency keys, OrderedStrategy with strict partitioning). Broker delegates without changing routing logic.', difficulty: 'Medium' },
      { area: 'Wildcard Topic Matching', description: 'Add hierarchical topic support (e.g., "sports.*", "sports.cricket.#"). Subscription filter matches against wildcard patterns. Existing Topic model handles routing.', difficulty: 'Medium' },
      { area: 'Message Persistence', description: 'Add MessageStore interface with InMemoryStore and DatabaseStore implementations. Messages persisted before delivery, removed after ack. Survives broker restarts.', difficulty: 'Medium' },
      { area: 'Backpressure / Flow Control', description: 'Add rate limiting per subscription. If subscriber is too slow, broker slows publishing or buffers messages. Implemented via FlowControlStrategy monitoring queue depth.', difficulty: 'Hard' },
    ],
  },

  carRental: {
    title: 'Car Rental — Design Details',
    requirements: [
      'Vehicle fleet management — add, update, remove vehicles with details (make, model, year, license plate, type, status)',
      'Vehicle states: AVAILABLE, RESERVED, RENTED, MAINTENANCE, RETIRED — only AVAILABLE vehicles can be reserved',
      'Customer registration — customers can sign up with license, insurance, payment info and view rental history',
      'Reservation system — customer selects vehicle, dates, and location; reservation holds the vehicle and calculates estimated cost',
      'Branch-based operations — vehicles are distributed across rental branches; customers pick up and return at branches',
      'Pricing with variable rates — daily rate varies by vehicle type, rental duration (longer = discount), and season',
      'Vehicle pickup and return workflow — pickup activates rental, return calculates actual cost (including late fees and mileage), processes payment',
      'Payment processing — multiple payment methods (credit card, debit card, wallet) with authorization and capture flow',
    ],
    entities: [
      {
        name: 'RentalService',
        description: 'Core business logic orchestrator. Handles reservation, pickup, return, and cancellation workflows. Coordinates between Inventory, Pricing, and Payment services.',
        fields: [
          { name: 'inventoryService', type: 'InventoryService', description: 'Manages vehicle availability per branch' },
          { name: 'reservationRepo', type: 'Repository<Reservation>', description: 'Data store for all reservations' },
          { name: 'pricingStrategy', type: 'PricingStrategy', description: 'Calculates rental cost based on vehicle, duration, and modifiers' },
        ],
        methods: [
          { name: 'reserveVehicle(customerId, vehicleType, dates, branch)', returns: 'Reservation', description: 'Creates a reservation with estimated cost' },
          { name: 'pickup(reservationId)', returns: 'Rental', description: 'Activates rental, changes vehicle to RENTED' },
          { name: 'returnVehicle(rentalId, odometerReading)', returns: 'Invoice', description: 'Calculates final cost, processes payment, generates invoice' },
          { name: 'cancelReservation(reservationId)', returns: 'void', description: 'Cancels reservation and releases vehicle hold' },
        ],
      },
      {
        name: 'Vehicle',
        description: 'Rental vehicle with identification, classification, status tracking, and maintenance history.',
        fields: [
          { name: 'licensePlate', type: 'String', description: 'Unique vehicle identifier' },
          { name: 'make', type: 'String', description: 'Manufacturer (Toyota, Honda, BMW)' },
          { name: 'model', type: 'String', description: 'Model name/number' },
          { name: 'year', type: 'int', description: 'Manufacturing year' },
          { name: 'type', type: 'VehicleType', description: 'CAR, SUV, TRUCK, VAN, LUXURY' },
          { name: 'status', type: 'VehicleStatus', description: 'AVAILABLE, RESERVED, RENTED, MAINTENANCE, RETIRED' },
          { name: 'currentBranch', type: 'RentalBranch', description: 'Branch where vehicle is currently located' },
          { name: 'odometer', type: 'int', description: 'Current mileage reading' },
        ],
        methods: [
          { name: 'changeStatus(newStatus)', returns: 'void', description: 'Updates vehicle status with validation' },
          { name: 'moveToBranch(branch)', returns: 'void', description: 'Transfers vehicle to a different branch' },
        ],
      },
      {
        name: 'Customer',
        description: 'Renter with personal details, payment methods, driving credentials, and rental history.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique customer identifier' },
          { name: 'name', type: 'String', description: 'Full name as on license' },
          { name: 'licenseNumber', type: 'String', description: 'Valid driving license identifier' },
          { name: 'paymentMethods', type: 'List<PaymentMethod>', description: 'Saved payment methods for checkout' },
          { name: 'rentalHistory', type: 'List<Rental>', description: 'Past and current rentals' },
        ],
        methods: [
          { name: 'addPaymentMethod(method)', returns: 'void', description: 'Adds a new payment method for future rentals' },
          { name: 'getActiveRentals()', returns: 'List<Rental>', description: 'Returns rentals currently in progress' },
        ],
      },
      {
        name: 'Reservation',
        description: 'Holds a vehicle for a customer for specific dates. Has status: PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique reservation identifier' },
          { name: 'customer', type: 'Customer', description: 'Customer who made the reservation' },
          { name: 'vehicle', type: 'Vehicle', description: 'Reserved vehicle' },
          { name: 'pickupDate', type: 'LocalDateTime', description: 'Scheduled pickup time' },
          { name: 'returnDate', type: 'LocalDateTime', description: 'Scheduled return time' },
          { name: 'pickupBranch', type: 'RentalBranch', description: 'Branch for vehicle pickup' },
          { name: 'estimatedCost', type: 'double', description: 'Pre-rental cost estimate' },
          { name: 'status', type: 'ReservationStatus', description: 'PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED' },
        ],
        methods: [
          { name: 'confirm()', returns: 'void', description: 'Confirms reservation (payment authorization)' },
          { name: 'cancel()', returns: 'void', description: 'Cancels reservation and releases vehicle' },
        ],
      },
      {
        name: 'RentalBranch',
        description: 'Physical location where vehicles are parked and customers pick up/return cars. Manages local inventory.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique branch identifier' },
          { name: 'name', type: 'String', description: 'Branch name/location' },
          { name: 'address', type: 'String', description: 'Physical address' },
          { name: 'inventory', type: 'List<Vehicle>', description: 'Vehicles currently at this branch' },
        ],
        methods: [
          { name: 'addVehicle(vehicle)', returns: 'void', description: 'Adds a new vehicle to branch inventory' },
          { name: 'removeVehicle(vehicle)', returns: 'void', description: 'Removes a vehicle from the branch' },
          { name: 'findAvailableVehicles(type, dates)', returns: 'List<Vehicle>', description: 'Searches for available vehicles matching criteria' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Strategy', used: true, explanation: 'PricingStrategy interface with DailyRateStrategy, SeasonalStrategy, LoyaltyDiscountStrategy, LongRentalDiscountStrategy. RentalService delegates pricing to composed strategy.' },
      { name: 'Singleton', used: true, explanation: 'RentalService, InventoryService, and PaymentService are singletons ensuring consistent state. A single RentalService prevents double-booking of vehicles.' },
      { name: 'Factory', used: true, explanation: 'VehicleFactory creates Vehicle instances with proper initial state. ReservationFactory creates reservations with correct status flow and generates IDs.' },
      { name: 'State', used: true, explanation: 'VehicleStatus enum implements State pattern. AVAILABLE goes to RESERVED or MAINTENANCE. RENTED goes to AVAILABLE (after return). Invalid transitions are rejected.' },
      { name: 'Observer', used: false, explanation: 'When a vehicle becomes AVAILABLE, interested customers could be notified via an AvailabilityObserver without RentalService managing notification logic.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'RentalService handles rental workflow. PricingStrategy calculates costs. RentalBranch manages local inventory. PaymentService processes transactions. Vehicle tracks its own state.' },
      { name: 'Open/Closed (OCP)', description: 'New pricing strategies implement PricingStrategy. New vehicle types add a constant. New payment gateways implement PaymentGateway. Core rental workflow unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'RentalService depends on PricingStrategy and PaymentGateway interfaces. Branches depend on Vehicle abstractions. High-level policies don\'t depend on low-level details.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Vehicle availability checking is in RentalBranch, not duplicated per service call. Cost calculation is delegated to PricingStrategy. Payment processing is centralized.' },
      { name: 'Liskov Substitution (LSP)', description: 'Any PricingStrategy (DailyRate, Seasonal, Loyalty) can substitute another. Any PaymentGateway (Stripe, PayPal) is interchangeable without breaking RentalService.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Pricing Strategies', description: 'RentalService calls calculatePrice() on PricingStrategy interface. Different strategies implement pricing differently and can be composed (e.g., DailyRate + Seasonal surcharge).', alternative: 'Could have a single method with if-else for each factor. Strategy pattern is more flexible as pricing rules change independently.' },
      { name: 'Composition over Inheritance', description: 'RentalBranch has-a List of Vehicle. Customer has-a List of PaymentMethod. Reservation has-a Customer and Vehicle. System composes entities rather than deep hierarchies.', alternative: 'Could extend a BaseEntity for all objects. Composition is chosen because relationships are structural aggregations.' },
      { name: 'Encapsulation — Vehicle Status', description: 'Vehicle encapsulates status with changeStatus() validating state transitions. External code cannot set status directly, preventing illegal states like renting a MAINTENANCE vehicle.', alternative: 'Could expose setStatus() setter. Encapsulated transitions enforce business rules at the model level.' },
    ],
    extensibility: [
      { area: 'New Vehicle Type', description: 'Add constant to VehicleType enum. Define daily rate. Add to branch inventory. No structural changes to rental workflow.', difficulty: 'Easy' },
      { area: 'Insurance Add-on', description: 'Add InsuranceOption entity linked to Reservation with tiers (Basic, Premium, Zero-Deductible). PricingStrategy includes insurance in total calculation.', difficulty: 'Easy' },
      { area: 'One-Way Rental', description: 'Allow returning vehicle to a different branch. Add dropBranch to Reservation. On return, vehicle transfers to dropBranch inventory. Pricing includes one-way fee.', difficulty: 'Medium' },
      { area: 'Loyalty Program', description: 'Add LoyaltyProgram with tiers (Silver, Gold, Platinum). Implement LoyaltyPricingStrategy for tier-based discounts. Points earned per rental redeemable for free days.', difficulty: 'Medium' },
    ],
  },

  auction: {
    title: 'Auction — Design Details',
    requirements: [
      'Auction creation — seller creates an auction for an item with reserve price, start time, and end time',
      'Bidding — registered users can place bids on active auctions, each bid must be higher than the current highest bid',
      'Automatic bidding — users can set a maximum bid amount; the system auto-bids incrementally on their behalf up to their max',
      'Auction states: UPCOMING, ACTIVE, EXTENDED, CLOSED, SOLD, UNSOLD — state transitions based on time and bid activity',
      'Bid increment rules — each new bid must exceed the current bid by at least the configured increment amount',
      'Auction extension — if a bid is placed in the final minute, the auction extends by 1 minute (soft-close / anti-sniping)',
      'Winner determination — highest bidder at auction close wins; if no bids meet reserve price, item is UNSOLD',
      'Notifications — bidders notified when outbid, when auction ends, and when they win or lose',
    ],
    entities: [
      {
        name: 'AuctionService',
        description: 'Core orchestrator managing auction lifecycle: creation, bidding, automatic extension, and closing. Coordinates between repositories and notification service.',
        fields: [
          { name: 'auctionRepo', type: 'Repository<Auction>', description: 'Data store for all auctions' },
          { name: 'bidRepo', type: 'Repository<Bid>', description: 'Data store for all bids' },
          { name: 'notificationService', type: 'NotificationService', description: 'Sends outbid, won, lost notifications' },
          { name: 'scheduler', type: 'ScheduledExecutorService', description: 'Manages auction start/end timers and extension scheduling' },
        ],
        methods: [
          { name: 'createAuction(seller, item, reservePrice, duration)', returns: 'Auction', description: 'Creates a new auction in UPCOMING state' },
          { name: 'placeBid(auctionId, bidder, amount)', returns: 'Bid', description: 'Places a bid if valid (above current + increment). Triggers auto-extension if in final minute.' },
          { name: 'closeAuction(auctionId)', returns: 'Auction', description: 'Determines winner or marks as UNSOLD. Sends notifications.' },
          { name: 'cancelAuction(auctionId)', returns: 'void', description: 'Cancels auction (only before start or by seller)' },
        ],
      },
      {
        name: 'Auction',
        description: 'An auction event for a single item. Maintains state, current highest bid, bid history, and timing configuration.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique auction identifier' },
          { name: 'item', type: 'Item', description: 'The item being auctioned' },
          { name: 'seller', type: 'User', description: 'User who listed the item' },
          { name: 'reservePrice', type: 'double', description: 'Minimum acceptable price — bids below this don\'t win even if highest' },
          { name: 'highestBid', type: 'Bid', description: 'Current winning bid' },
          { name: 'bidIncrement', type: 'double', description: 'Minimum amount next bid must exceed current by' },
          { name: 'status', type: 'AuctionStatus', description: 'UPCOMING, ACTIVE, EXTENDED, CLOSED, SOLD, UNSOLD' },
          { name: 'startTime', type: 'LocalDateTime', description: 'Scheduled auction start' },
          { name: 'endTime', type: 'LocalDateTime', description: 'Scheduled end (may be extended)' },
          { name: 'maxBids', type: 'Map<User, Double>', description: 'Maximum auto-bid amounts per user' },
        ],
        methods: [
          { name: 'start()', returns: 'void', description: 'Transitions to ACTIVE and begins accepting bids' },
          { name: 'placeBid(bid)', returns: 'boolean', description: 'Processes a new bid — validates amount, updates highest, checks extension' },
          { name: 'extend()', returns: 'void', description: 'Extends endTime by extension period (anti-sniping)' },
          { name: 'close()', returns: 'void', description: 'Finalizes auction — determines winning bid or marks unsold' },
        ],
      },
      {
        name: 'Bid',
        description: 'A single bid placed by a user on an auction. Contains amount, timestamp, and whether it was automatic.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique bid identifier' },
          { name: 'auction', type: 'Auction', description: 'Auction this bid belongs to' },
          { name: 'bidder', type: 'User', description: 'User placing the bid' },
          { name: 'amount', type: 'double', description: 'Bid amount (must exceed current highest + increment)' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the bid was placed' },
          { name: 'isAutoBid', type: 'boolean', description: 'True if system placed this bid on behalf of the user' },
        ],
        methods: [],
      },
      {
        name: 'User',
        description: 'Auction participant — can be a seller (creates auctions) or bidder (places bids). Has notification preferences and bidding history.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique user identifier' },
          { name: 'name', type: 'String', description: 'Display name' },
          { name: 'email', type: 'String', description: 'Contact email for notifications' },
        ],
        methods: [
          { name: 'createAuction(item, reservePrice, duration)', returns: 'Auction', description: 'Creates a new auction as seller' },
          { name: 'placeBid(auction, amount)', returns: 'Bid', description: 'Places a bid on an active auction' },
          { name: 'setMaxBid(auction, maxAmount)', returns: 'void', description: 'Sets maximum auto-bid amount' },
        ],
      },
      {
        name: 'NotificationService',
        description: 'Manages user notifications for auction events: outbid alerts, auction start, auction end, won/lost results.',
        fields: [
          { name: 'subscribers', type: 'Map<String, List<User>>', description: 'Users subscribed to notifications per auction' },
        ],
        methods: [
          { name: 'onOutbid(auction, bidder)', returns: 'void', description: 'Notifies previous highest bidder they\'ve been outbid' },
          { name: 'onAuctionEnd(auction)', returns: 'void', description: 'Notifies winner and all participants of auction result' },
          { name: 'onAuctionStart(auction)', returns: 'void', description: 'Notifies watchers that an auction they follow has started' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'NotificationService implements Observer. Bidders subscribe to events (outbid, won, lost). AuctionService notifies without knowing who is watching. Also used for auto-bidding — system watches bids and auto-places higher bids up to max.' },
      { name: 'State', used: true, explanation: 'AuctionStatus enum with transitions: UPCOMING to ACTIVE to EXTENDED/CLOSED, CLOSED to SOLD/UNSOLD. Each state determines which operations are allowed. State machine prevents illegal transitions.' },
      { name: 'Singleton', used: true, explanation: 'AuctionService and NotificationService are singletons ensuring single source of truth for auction state. Critical for preventing bid conflicts on concurrent bids.' },
      { name: 'Strategy', used: true, explanation: 'BidIncrementStrategy interface with FixedIncrementStrategy, PercentageIncrementStrategy, DynamicIncrementStrategy (based on bid velocity). Auction delegates increment calculation to strategy.' },
      { name: 'Proxy', used: false, explanation: 'An AuctionProxy could control access based on state — rejecting bids on CLOSED auctions, blocking cancelled auctions. Separates access control from business logic.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Auction manages state and bids. Bid is a value object. User handles participant actions. AuctionService orchestrates workflow. NotificationService manages alerts.' },
      { name: 'Open/Closed (OCP)', description: 'New bid increment strategies implement BidIncrementStrategy. New auction statuses add to enum. New notification channels implement NotificationChannel. Core auction flow stays closed.' },
      { name: 'Dependency Inversion (DIP)', description: 'AuctionService depends on Auction and Bid abstractions. NotificationService depends on NotificationChannel interface. Workflow logic doesn\'t depend on low-level infrastructure.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Bid validation is in Auction.placeBid(). Timer logic for extension is in one place. Notification dispatch is centralized in NotificationService. No duplication.' },
      { name: 'KISS (Keep It Simple)', description: 'English auction model: highest bid wins. Time-based state machine. Anti-sniping is just an extension timer. Complexities like sealed bids are deliberate extensions.' },
    ],
    oopConcepts: [
      { name: 'State Machine — Auction Status', description: 'AuctionStatus enum drives allowed operations. placeBid() checks status is ACTIVE/EXTENDED. close() requires ACTIVE/EXTENDED. cancel() requires UPCOMING. Invalid states are unrepresentable.', alternative: 'Could use boolean flags (isActive, isClosed). Enum makes exactly one state valid at any time, preventing contradictory flags.' },
      { name: 'Composition over Inheritance', description: 'Auction has-a Item, List of Bid, and highest Bid. Bid has-a User (bidder). User has-a List of Auction and List of Bid. Domain modeled through entity composition.', alternative: 'Could create auction type hierarchy (EnglishAuction extends Auction). Composition is chosen for flexibility.' },
      { name: 'Encapsulation — Bid Validation', description: 'Auction.placeBid() encapsulates all validation: checks auction is active, amount exceeds bid + increment, handles auto-extension. External code cannot bypass rules.', alternative: 'Could validate in service layer. Encapsulated validation keeps business rules co-located with protected state.' },
    ],
    extensibility: [
      { area: 'New Auction Type', description: 'Add DutchAuction (descending price) or SealedBidAuction. Each implements different bidding logic. AuctionService delegates to the auction type.', difficulty: 'Hard' },
      { area: 'Buy It Now', description: 'Add buyNowPrice to Auction. User purchases immediately at this price, ending auction early. Auction transitions to SOLD directly from ACTIVE.', difficulty: 'Easy' },
      { area: 'Proxy Bidding (Auto-bid)', description: 'Users set maximum bid. System monitors auction and automatically places incremental bids when outbid. Implemented via scheduled task evaluating active auctions.', difficulty: 'Medium' },
      { area: 'Watchlist / Favorites', description: 'Users add auctions to watchlist. Watchers notified when auction starts and when new bids placed. Implemented via existing NotificationService with minimal changes.', difficulty: 'Easy' },
    ],
  },

  restaurant: {
    title: 'Restaurant — Design Details',
    requirements: [
      'Menu management — multiple menu categories (appetizers, mains, desserts, beverages) each with items, prices, descriptions, and availability',
      'Table management — tables with capacity, location (indoor/outdoor), and status (AVAILABLE, RESERVED, OCCUPIED)',
      'Reservation system — customers can reserve tables for a specific date/time/party size with contact information',
      'Order placement — waiters create orders for occupied tables, add/remove items, and send orders to the kitchen',
      'Order status workflow: PLACED to PREPARING to READY to SERVED to BILLED — with optional CANCEL from PLACED state',
      'Kitchen display — chefs see pending orders sorted by time, mark items as PREPARING and READY',
      'Billing and payment — generate bill for table, split bill between customers, process payments (cash/card/digital)',
      'Multiple restaurant branches — each branch has its own menu, tables, staff, and orders',
    ],
    entities: [
      {
        name: 'RestaurantService',
        description: 'Core orchestrator managing tables, reservations, orders, and billing. Coordinates between kitchen and front-of-house staff.',
        fields: [
          { name: 'tables', type: 'Map<String, Table>', description: 'All tables in the restaurant indexed by number' },
          { name: 'menu', type: 'Menu', description: 'Full menu with categories and items' },
          { name: 'orders', type: 'Map<String, Order>', description: 'All active and completed orders' },
          { name: 'reservations', type: 'List<Reservation>', description: 'All upcoming and past reservations' },
        ],
        methods: [
          { name: 'reserveTable(customer, partySize, time)', returns: 'Reservation', description: 'Finds available table matching party size and time' },
          { name: 'createOrder(tableId, waiter)', returns: 'Order', description: 'Creates a new order for an occupied table' },
          { name: 'generateBill(tableId)', returns: 'Bill', description: 'Calculates total for all consumed items on the table' },
          { name: 'processPayment(bill, method)', returns: 'Payment', description: 'Processes payment and closes the bill' },
        ],
      },
      {
        name: 'Menu',
        description: 'Restaurant menu organized into categories (starters, mains, desserts, drinks). Each item has pricing, dietary info, and availability.',
        fields: [
          { name: 'categories', type: 'List<MenuCategory>', description: 'Menu sections like Appetizers, Main Course, Desserts' },
        ],
        methods: [
          { name: 'addItem(category, item)', returns: 'void', description: 'Adds a new item to the specified category' },
          { name: 'removeItem(itemId)', returns: 'void', description: 'Removes an item from the menu (sets unavailable)' },
          { name: 'getAvailableItems()', returns: 'List<MenuItem>', description: 'Returns all currently available menu items' },
        ],
      },
      {
        name: 'Order',
        description: 'Customer order for a specific table. Contains ordered items with quantities, special instructions, and status tracking per item.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique order identifier' },
          { name: 'table', type: 'Table', description: 'Table that placed the order' },
          { name: 'waiter', type: 'Staff', description: 'Waiter who took the order' },
          { name: 'items', type: 'List<OrderItem>', description: 'Ordered items with quantity and status' },
          { name: 'status', type: 'OrderStatus', description: 'PLACED, PREPARING, READY, SERVED, BILLED, CANCELLED' },
          { name: 'createdAt', type: 'LocalDateTime', description: 'When the order was placed' },
          { name: 'notes', type: 'String', description: 'Special instructions for the kitchen' },
        ],
        methods: [
          { name: 'addItem(menuItem, quantity)', returns: 'void', description: 'Adds an item to the order' },
          { name: 'removeItem(orderItemId)', returns: 'void', description: 'Removes an item (only if order is PLACED)' },
          { name: 'updateStatus(newStatus)', returns: 'boolean', description: 'Updates order status with state machine validation' },
        ],
      },
      {
        name: 'Table',
        description: 'Restaurant table with capacity, location, and current status. Tracks current order and reservation.',
        fields: [
          { name: 'number', type: 'String', description: 'Table identifier (e.g., T5, Patio-3)' },
          { name: 'capacity', type: 'int', description: 'Maximum number of seats' },
          { name: 'location', type: 'String', description: 'INDOOR, OUTDOOR, VIP, BAR' },
          { name: 'status', type: 'TableStatus', description: 'AVAILABLE, RESERVED, OCCUPIED' },
          { name: 'currentOrder', type: 'Order', description: 'Active order for this table (null if no order)' },
        ],
        methods: [
          { name: 'occupy()', returns: 'void', description: 'Marks table as OCCUPIED (from AVAILABLE or RESERVED)' },
          { name: 'release()', returns: 'void', description: 'Marks table as AVAILABLE after bill is paid' },
        ],
      },
      {
        name: 'KitchenService',
        description: 'Manages the kitchen display system. Chefs view pending orders, claim items for preparation, and mark them ready.',
        fields: [
          { name: 'pendingItems', type: 'Queue<OrderItem>', description: 'Items awaiting preparation, ordered by time' },
          { name: 'chefs', type: 'List<Staff>', description: 'Chefs currently working in the kitchen' },
        ],
        methods: [
          { name: 'viewPendingOrders()', returns: 'List<Order>', description: 'Returns orders sorted by time with PREPARING or PLACED items' },
          { name: 'startPreparation(orderItemId, chef)', returns: 'void', description: 'Chef claims an item and starts preparing' },
          { name: 'markReady(orderItemId)', returns: 'void', description: 'Marks prepared item as READY for serving' },
        ],
      },
      {
        name: 'Bill',
        description: 'Itemized bill for a table\'s consumption. Supports split bills, discounts, service charge, and tax calculations.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique bill identifier' },
          { name: 'table', type: 'Table', description: 'Table this bill belongs to' },
          { name: 'items', type: 'List<BillItem>', description: 'All consumed items with prices' },
          { name: 'subtotal', type: 'double', description: 'Sum of all item prices before tax and discounts' },
          { name: 'tax', type: 'double', description: 'Applicable tax amount' },
          { name: 'serviceCharge', type: 'double', description: 'Service charge (if applicable)' },
          { name: 'total', type: 'double', description: 'Final amount after all additions' },
          { name: 'isPaid', type: 'boolean', description: 'Whether the bill has been fully paid' },
        ],
        methods: [
          { name: 'addItem(item)', returns: 'void', description: 'Adds a menu item to the bill' },
          { name: 'calculateTotal()', returns: 'double', description: 'Computes subtotal + tax + service charge' },
          { name: 'split(numberOfPeople)', returns: 'List<Bill>', description: 'Splits the bill equally among specified number of people' },
          { name: 'applyDiscount(percentage)', returns: 'void', description: 'Applies a discount percentage to the total' },
        ],
      },
    ],
    designPatterns: [
      { name: 'State', used: true, explanation: 'OrderStatus enum with state machine: PLACED to PREPARING to READY to SERVED to BILLED, with CANCEL from PLACED/PREPARING. TableStatus also follows state pattern (AVAILABLE to RESERVED to OCCUPIED to AVAILABLE).' },
      { name: 'Singleton', used: true, explanation: 'RestaurantService and KitchenService are singletons ensuring single view of orders, tables, and reservations. Critical for avoiding double-booking tables.' },
      { name: 'Observer', used: true, explanation: 'KitchenService observes new orders. When waiter places order, kitchen display updates automatically. Chefs notified of new items. Status changes also notify waiters when items are READY.' },
      { name: 'Factory', used: true, explanation: 'OrderFactory creates orders with proper initial state, unique IDs, and timestamps. BillFactory generates itemized bills from order items.' },
      { name: 'Strategy', used: false, explanation: 'PricingStrategy could handle different billing models: FixedPrice, HappyHourDiscount, MembershipDiscount, or DynamicPricing based on demand.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Menu manages food catalog. Order handles items and status. Table manages seating. KitchenService handles prep workflow. RestaurantService coordinates. Bill handles payment.' },
      { name: 'Open/Closed (OCP)', description: 'New menu item types extend MenuItem. New order statuses add to enum. New payment methods implement PaymentGateway. Core workflow remains closed.' },
      { name: 'Dependency Inversion (DIP)', description: 'RestaurantService depends on Menu, Table, Order abstractions. Payment processing depends on PaymentGateway abstraction. High-level modules don\'t depend on low-level details.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Table availability is in RestaurantService. Order status validation is in Order entity. Bill calculation is in Bill.calculateTotal(). No duplication across services.' },
      { name: 'Law of Demeter', description: 'Waiter doesn\'t modify OrderItem directly — calls Order.updateStatus(). Chef goes through KitchenService. Objects only talk to immediate neighbors.' },
    ],
    oopConcepts: [
      { name: 'Encapsulation — Order Status', description: 'Order encapsulates status with updateStatus() enforcing valid transitions. PLACED to SERVED rejected (must go through PREPARING to READY). CANCEL from SERVED rejected.', alternative: 'Could expose setStatus(). Encapsulated transitions enforce workflow rules at model level.' },
      { name: 'Composition over Inheritance', description: 'Order has-a List of OrderItem. Table has-a current Order. Menu has-a List of MenuCategory, which has-a List of MenuItem. Everything is composed.', alternative: 'Could create BaseOrder class hierarchy. Composition is chosen because entities have diverse relationships.' },
      { name: 'Polymorphism — Payment Methods', description: 'PaymentService processes via PaymentMethod interface. CashPayment, CardPayment, DigitalPayment each implement processPayment() differently.', alternative: 'Could use type flag with switch. Polymorphism is chosen because each method has different validation steps.' },
    ],
    extensibility: [
      { area: 'Online Ordering / Takeaway', description: 'Add TakeawayOrder that doesn\'t require table assignment. Extends Order with pickup time. Kitchen workflow unchanged.', difficulty: 'Easy' },
      { area: 'Table Side Ordering (QR)', description: 'Customers scan QR to view menu and order directly. New OrderSource field tracks online vs. waiter orders. Existing order workflow unchanged.', difficulty: 'Medium' },
      { area: 'Inventory Management', description: 'Link MenuItem to Ingredient list with stock levels. Reduce ingredient stock on order. Alert when low. Existing menu and order models unchanged.', difficulty: 'Medium' },
      { area: 'Kitchen Display Integration', description: 'Connect to physical kitchen display via WebSocket. KitchenService pushes real-time updates (new orders, status changes) to screens.', difficulty: 'Medium' },
    ],
  },

  socialNetwork: {
    title: 'Social Network — Design Details',
    requirements: [
      'User profiles with bio, profile picture, cover photo, and personal information with privacy controls',
      'Friend system — send, accept, reject, and cancel friend requests with bidirectional friendship',
      'Post creation — users create posts with text, images, and videos; visibility can be PUBLIC, FRIENDS_ONLY, or PRIVATE',
      'Feed generation — personalized feed showing posts from friends, liked pages, and suggested content ranked by relevance',
      'Social interactions — like, comment, and share posts with engagement notifications',
      'Friend recommendations — suggest new friends based on mutual friends, shared interests, and location',
      'Groups and pages — users can create and join groups, follow pages for topic-specific content',
      'Notification system — real-time notifications for friend requests, likes, comments, shares, and birthday reminders',
    ],
    entities: [
      {
        name: 'User',
        description: 'Core member with profile, social graph, posts, and privacy settings. Manages friendships and content visibility.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique user identifier' },
          { name: 'profile', type: 'Profile', description: 'Personal profile with bio, photos, and info' },
          { name: 'friends', type: 'Set<User>', description: 'Accepted bidirectional friendships' },
          { name: 'pendingRequests', type: 'List<FriendRequest>', description: 'Sent and received pending friend requests' },
          { name: 'privacySettings', type: 'PrivacySettings', description: 'Controls who can see posts, profile info, and friend list' },
        ],
        methods: [
          { name: 'sendFriendRequest(target)', returns: 'FriendRequest', description: 'Sends a friend request to another user' },
          { name: 'acceptRequest(request)', returns: 'void', description: 'Accepts a pending friend request' },
          { name: 'rejectRequest(request)', returns: 'void', description: 'Rejects a pending friend request' },
          { name: 'createPost(content, visibility)', returns: 'Post', description: 'Creates a new post with specified visibility' },
        ],
      },
      {
        name: 'Profile',
        description: 'User\'s personal and public information. Sections controlled by privacy settings for granular access control.',
        fields: [
          { name: 'displayName', type: 'String', description: 'Name shown to other users' },
          { name: 'bio', type: 'String', description: 'Short personal description' },
          { name: 'profilePicture', type: 'String', description: 'URL to profile photo' },
          { name: 'coverPhoto', type: 'String', description: 'URL to cover image' },
          { name: 'interests', type: 'List<String>', description: 'User interests for friend suggestions and feed ranking' },
          { name: 'location', type: 'String', description: 'Geographic location for local content' },
        ],
        methods: [
          { name: 'updateProfile(fields)', returns: 'void', description: 'Updates specified profile fields' },
          { name: 'getVisibleProfile(viewer)', returns: 'Profile', description: 'Returns profile data according to viewer relationship' },
        ],
      },
      {
        name: 'Post',
        description: 'User-generated content with text and media attachments. Supports likes, comments, shares, and visibility controls.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique post identifier' },
          { name: 'author', type: 'User', description: 'User who created the post' },
          { name: 'content', type: 'Content', description: 'Post body with text and optional media' },
          { name: 'visibility', type: 'Visibility', description: 'PUBLIC, FRIENDS_ONLY, or PRIVATE' },
          { name: 'likes', type: 'Set<User>', description: 'Users who liked this post' },
          { name: 'comments', type: 'List<Comment>', description: 'Comments on this post' },
          { name: 'sharedBy', type: 'List<User>', description: 'Users who shared this post' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'Creation time' },
        ],
        methods: [
          { name: 'like(user)', returns: 'void', description: 'Toggles like from the specified user' },
          { name: 'addComment(user, text)', returns: 'Comment', description: 'Adds a comment to the post' },
          { name: 'share(user)', returns: 'Post', description: 'Creates a reshare of the post by the given user' },
          { name: 'isVisibleTo(user)', returns: 'boolean', description: 'Checks if the given user can view this post' },
        ],
      },
      {
        name: 'FeedService',
        description: 'Generates personalized feeds by merging posts from friends, pages, and recommendations. Ranks by relevance score.',
        fields: [
          { name: 'rankingStrategy', type: 'FeedRankingStrategy', description: 'Algorithm for ordering feed content' },
        ],
        methods: [
          { name: 'getFeed(user, page, size)', returns: 'FeedPage', description: 'Returns paginated, ranked feed for the user' },
          { name: 'rankPosts(posts, user)', returns: 'List<Post>', description: 'Applies ranking algorithm to post collection' },
        ],
      },
      {
        name: 'FriendSuggestionService',
        description: 'Recommends potential friends using graph algorithms — mutual friends, shared interests, location proximity, and network distance.',
        fields: [
          { name: 'suggestionStrategies', type: 'List<SuggestionStrategy>', description: 'Multiple strategies combined for recommendations' },
        ],
        methods: [
          { name: 'getSuggestions(user, limit)', returns: 'List<User>', description: 'Returns ranked friend suggestions' },
          { name: 'getMutualFriends(user1, user2)', returns: 'List<User>', description: 'Finds common friends between two users' },
        ],
      },
      {
        name: 'NotificationService',
        description: 'Manages real-time and digest notifications for all social interactions: friend requests, likes, comments, shares, and birthdays.',
        fields: [
          { name: 'notificationQueue', type: 'Queue<Notification>', description: 'Pending notifications to be dispatched' },
        ],
        methods: [
          { name: 'notify(recipient, event)', returns: 'void', description: 'Creates and dispatches notification for an event' },
          { name: 'getNotifications(user)', returns: 'List<Notification>', description: 'Returns unread notifications for the user' },
          { name: 'markRead(notificationId)', returns: 'void', description: 'Marks a notification as read' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'NotificationService observes social events (likes, comments, friend requests). When a user interacts, all relevant participants are notified. Originating classes don\'t know about notification delivery.' },
      { name: 'Factory', used: true, explanation: 'PostFactory creates different post types (TextPost, ImagePost, VideoPost, LinkPost). Each has different rendering. Feed treats all posts uniformly through Post interface.' },
      { name: 'Singleton', used: true, explanation: 'FeedService, NotificationService, and FriendSuggestionService are singletons ensuring consistent ranking and preventing duplicate notifications.' },
      { name: 'Strategy', used: true, explanation: 'FeedRankingStrategy interface with ChronologicalRanking, EngagementRanking, MLRanking (personalized relevance). FeedService delegates to configured strategy.' },
      { name: 'Proxy', used: false, explanation: 'A PostProxy could enforce visibility before returning content. FRIENDS_ONLY posts check viewer relationship to author before allowing access. Separates access control from rendering.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'User manages profile and friendships. Post handles content and engagement. FeedService generates feeds. FriendSuggestionService recommends. NotificationService dispatches alerts.' },
      { name: 'Open/Closed (OCP)', description: 'New post types implement Post interface. New feed strategies implement FeedRankingStrategy. New notification channels implement NotificationChannel. Core entities unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'FeedService depends on FeedRankingStrategy abstraction. FriendSuggestionService depends on SuggestionStrategy. NotificationService depends on NotificationChannel.' },
      { name: 'Interface Segregation (ISP)', description: 'User has distinct methods for friendship vs content. Post has like/comment/share. No class has methods it doesn\'t use. Interfaces are fine-grained.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Friend request validation is centralized. Feed ranking is in FeedRankingStrategy. Notification dispatch is in NotificationService. Visibility checking is in Post.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Post Types in Feed', description: 'FeedService renders posts via Post interface. TextPost, ImagePost, VideoPost each render differently. Feed code calls render() without knowing concrete type.', alternative: 'Could use single Post class with type field and if-else. Polymorphism allows adding post types without modifying feed code.' },
      { name: 'Encapsulation — Privacy Controls', description: 'User encapsulates privacy settings. Profile provides getVisibleProfile() filtering data based on viewer relationship. External code cannot bypass privacy checks.', alternative: 'Could rely on frontend-only access control. Backend encapsulation provides security at data layer.' },
      { name: 'Composition over Inheritance', description: 'User has-a Profile, Set of Friend, List of FriendRequest. Profile has-a List of interests. Post has-a Content, Set of likes. Social graph built by composing entities.', alternative: 'Could have RichUser extending BaseUser. Composition is chosen because aspects change independently.' },
    ],
    extensibility: [
      { area: 'New Post Type', description: 'Create Post subclass (PollPost, EventPost). Implement Post interface. Add to PostFactory. Feed and engagement models work unchanged.', difficulty: 'Easy' },
      { area: 'News Feed Algorithm', description: 'Implement new FeedRankingStrategy (graph-based or ML-based). Swap via configuration. FeedService remains unchanged.', difficulty: 'Medium' },
      { area: 'Stories / Ephemeral Content', description: 'Add Story entity auto-deleting after 24 hours. Reuse Post model with TTL field and scheduled cleanup job.', difficulty: 'Medium' },
      { area: 'Reactions (Beyond Likes)', description: 'Extend Post.likes from Set<User> to Map<User, ReactionType>. ReactionType enum: LIKE, LOVE, HAHA, WOW, SAD, ANGRY.', difficulty: 'Easy' },
    ],
  },

  concertTicket: {
    title: 'Concert Ticket Booking — Design Details',
    requirements: [
      'Event management — create concerts with artist, venue, date, time, and description',
      'Venue seating — venues have sections (VIP, Premium, General) each with numbered seats and different pricing',
      'Seat selection — users view seat map and select specific seats for booking',
      'Booking workflow: PENDING to CONFIRMED to CANCELLED — seats are temporarily held during PENDING and released if payment fails',
      'Concurrent booking prevention — two users cannot book the same seat simultaneously (locking mechanism)',
      'Payment integration — process payment through configured gateway, confirm booking on payment success, release on failure',
      'Booking history — users can view past and upcoming bookings with e-ticket generation',
      'Cancellation and refund — users can cancel bookings before event date with configurable cancellation policy and refund amount',
    ],
    entities: [
      {
        name: 'BookingService',
        description: 'Core orchestration service managing seat selection, temporary holds, payment processing, and booking confirmation.',
        fields: [
          { name: 'eventRepo', type: 'Repository<Event>', description: 'Data store for all concert events' },
          { name: 'bookingRepo', type: 'Repository<Booking>', description: 'Data store for all bookings' },
          { name: 'seatLock', type: 'ReentrantLock', description: 'Ensures atomic seat booking operations' },
          { name: 'paymentGateway', type: 'PaymentGateway', description: 'External payment processor' },
        ],
        methods: [
          { name: 'selectSeats(eventId, seatIds, user)', returns: 'Booking', description: 'Creates a PENDING booking, temporarily holds seats with a 10-minute timer' },
          { name: 'confirmBooking(bookingId, paymentDetails)', returns: 'Booking', description: 'Processes payment and confirms booking, or releases seats on failure' },
          { name: 'cancelBooking(bookingId)', returns: 'Booking', description: 'Cancels booking, releases seats, processes refund if applicable' },
          { name: 'releaseExpiredHolds()', returns: 'void', description: 'Releases seats for PENDING bookings that exceeded hold duration' },
        ],
      },
      {
        name: 'Event',
        description: 'Concert event with artist information, schedule, venue assignment, and ticket pricing configuration.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique event identifier' },
          { name: 'artist', type: 'String', description: 'Performer or band name' },
          { name: 'venue', type: 'Venue', description: 'Concert venue with seating layout' },
          { name: 'dateTime', type: 'LocalDateTime', description: 'Concert start time' },
          { name: 'status', type: 'EventStatus', description: 'SCHEDULED, SOLD_OUT, CANCELLED, COMPLETED' },
          { name: 'cancellationPolicy', type: 'CancellationPolicy', description: 'Refund rules and deadlines' },
        ],
        methods: [
          { name: 'getAvailableSeats()', returns: 'List<Seat>', description: 'Returns seats not booked or held' },
          { name: 'holdSeats(seatIds)', returns: 'boolean', description: 'Temporarily marks seats as held' },
          { name: 'releaseSeats(seatIds)', returns: 'void', description: 'Releases held or booked seats back to available' },
        ],
      },
      {
        name: 'Venue',
        description: 'Physical venue with multiple seating sections (VIP, Premium, General), each with row/seat layout and pricing.',
        fields: [
          { name: 'name', type: 'String', description: 'Venue name (e.g., Madison Square Garden)' },
          { name: 'sections', type: 'List<Section>', description: 'Seating sections with capacity and pricing' },
          { name: 'seatMap', type: 'Map<String, Seat>', description: 'All seats indexed by seat ID for O(1) lookup' },
        ],
        methods: [
          { name: 'getSection(name)', returns: 'Section', description: 'Returns a specific seating section' },
          { name: 'getSeat(seatId)', returns: 'Seat', description: 'Returns a specific seat by ID' },
        ],
      },
      {
        name: 'Seat',
        description: 'Individual seat with unique identifier, section, row, number, status, and price.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique seat identifier (e.g., VIP-A-12)' },
          { name: 'section', type: 'Section', description: 'Seating section this seat belongs to' },
          { name: 'row', type: 'String', description: 'Row letter/number' },
          { name: 'number', type: 'int', description: 'Seat number within the row' },
          { name: 'price', type: 'double', description: 'Ticket price for this seat' },
          { name: 'status', type: 'SeatStatus', description: 'AVAILABLE, HELD, BOOKED' },
        ],
        methods: [
          { name: 'hold()', returns: 'boolean', description: 'Changes status to HELD if currently AVAILABLE' },
          { name: 'book()', returns: 'boolean', description: 'Changes status to BOOKED if currently HELD' },
          { name: 'release()', returns: 'void', description: 'Changes status back to AVAILABLE' },
        ],
      },
      {
        name: 'Booking',
        description: 'Ticket booking for a set of seats. Tracks payment, holds, status, and generates e-tickets.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique booking identifier' },
          { name: 'user', type: 'User', description: 'User who made the booking' },
          { name: 'event', type: 'Event', description: 'Concert event' },
          { name: 'seats', type: 'List<Seat>', description: 'Booked seats' },
          { name: 'totalAmount', type: 'double', description: 'Sum of seat prices' },
          { name: 'status', type: 'BookingStatus', description: 'PENDING, CONFIRMED, CANCELLED' },
          { name: 'holdExpiry', type: 'LocalDateTime', description: 'When the seat hold expires (10 min from selection)' },
          { name: 'paymentRef', type: 'String', description: 'Payment transaction reference' },
        ],
        methods: [
          { name: 'confirm()', returns: 'void', description: 'Confirms booking — seats become BOOKED' },
          { name: 'cancel()', returns: 'void', description: 'Cancels booking — seats released, refund processed' },
          { name: 'isHoldExpired()', returns: 'boolean', description: 'Checks if the seat hold timer has expired' },
          { name: 'generateETicket()', returns: 'ETicket', description: 'Generates downloadable e-ticket with QR code' },
        ],
      },
    ],
    designPatterns: [
      { name: 'State', used: true, explanation: 'SeatStatus (AVAILABLE to HELD to BOOKED) and BookingStatus (PENDING to CONFIRMED/CANCELLED) are both state machines. Valid transitions enforced.' },
      { name: 'Singleton', used: true, explanation: 'BookingService is a singleton ensuring single source of truth for seat availability. Critical for preventing double-booking.' },
      { name: 'Strategy', used: true, explanation: 'CancellationPolicy interface with NoRefundPolicy, FullRefundPolicy, PartialRefundPolicy. BookingService delegates refund calculation to the policy.' },
      { name: 'Proxy', used: false, explanation: 'A SeatAvailabilityProxy could cache seat status and serve read queries without hitting the main lock. Reduces lock contention on hot seats.' },
      { name: 'Observer', used: false, explanation: 'When VIP seats become available from cancellation, waitlisted users could be notified without BookingService knowing about notification.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Event manages concert details. Venue manages seating. Seat tracks individual state. Booking manages transaction lifecycle. BookingService orchestrates.' },
      { name: 'Open/Closed (OCP)', description: 'New cancellation policies implement CancellationPolicy. New seat statuses add to enum. New payment gateways implement PaymentGateway. Core booking flow stays closed.' },
      { name: 'Dependency Inversion (DIP)', description: 'BookingService depends on PaymentGateway and CancellationPolicy abstractions. Event depends on Venue. Seat depends on Section.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Seat hold/release is centralized in Event. Booking status validation is in Booking. Payment delegated to PaymentGateway. Cancellation in CancellationPolicy.' },
      { name: 'KISS (Keep It Simple)', description: 'Booking model: hold seats, pay, confirm. 10-minute hold timer is simple TTL check. Single ReentrantLock prevents double-booking.' },
    ],
    oopConcepts: [
      { name: 'Encapsulation — Seat State Changes', description: 'Seat encapsulates status with controlled methods (hold(), book(), release()). External code cannot set status directly.', alternative: 'Could expose setStatus(). Encapsulated transitions enforce booking invariants at model level.' },
      { name: 'Composition over Inheritance', description: 'Venue has-a List of Section. Section has-a List of Seat. Event has-a Venue. Booking has-a User, Event, and List of Seat.', alternative: 'Could create event type hierarchy. Composition is chosen because differences are in pricing and layout.' },
      { name: 'Polymorphism — Cancellation Policies', description: 'BookingService calls calculateRefund() on CancellationPolicy interface. NoRefund, FullRefund, PartialRefund each implement differently.', alternative: 'Could use if-else based on days-until-event. Strategy encapsulates each policy cleanly.' },
    ],
    extensibility: [
      { area: 'New Event Type', description: 'Add SportsEvent, TheaterEvent extending Event with type-specific fields. Booking, seat selection, payment workflows reused without change.', difficulty: 'Easy' },
      { area: 'Dynamic Pricing', description: 'Implement DynamicPricingStrategy adjusting seat prices based on demand. Pluggable via strategy pattern.', difficulty: 'Medium' },
      { area: 'Waitlist for Sold-Out Events', description: 'Users join waitlist. When cancellation occurs, first waitlisted user gets time-limited offer. Extends cancellation flow.', difficulty: 'Medium' },
      { area: 'Resale / Ticket Transfer', description: 'Allow users to list booked tickets for resale. ResaleTicket extends Booking. Requires new ResaleService with commission.', difficulty: 'Hard' },
    ],
  },

  cricinfo: {
    title: 'CricInfo — Design Details',
    requirements: [
      'Match management — create matches between two teams with venue, date, and match type (ODI, T20, Test)',
      'Team management — teams have a squad of players with roles (batsman, bowler, all-rounder, wicketkeeper)',
      'Live scoring — track each ball: runs scored, extras, wickets, boundaries, overs',
      'Innings management — each match has 1 or 2 innings per team; track batting order, fall of wickets, extras',
      'Scorecard generation — batting stats (runs, balls, 4s, 6s, SR) and bowling stats (overs, maidens, runs, wickets, economy)',
      'Commentary — ball-by-ball text commentary describing each delivery with over summary',
      'Match states: UPCOMING, LIVE, INNINGS_BREAK, COMPLETED, ABANDONED',
      'Statistics and rankings — player career stats, series standings, team rankings updated after each match',
    ],
    entities: [
      {
        name: 'MatchService',
        description: 'Core orchestrator managing match lifecycle — creation, scoring, innings transitions, and result determination.',
        fields: [
          { name: 'matchRepo', type: 'Repository<Match>', description: 'Data store for all matches' },
          { name: 'scoringService', type: 'ScoringService', description: 'Handles ball-by-ball scoring logic' },
          { name: 'commentaryService', type: 'CommentaryService', description: 'Manages ball-by-ball commentary' },
        ],
        methods: [
          { name: 'createMatch(teamA, teamB, venue, date, format)', returns: 'Match', description: 'Creates a new match in UPCOMING state' },
          { name: 'startMatch(matchId)', returns: 'void', description: 'Transitions match to LIVE, begins first innings' },
          { name: 'recordBall(matchId, ballData)', returns: 'Ball', description: 'Records a ball — runs, wicket, extras. Updates score and commentary.' },
          { name: 'endInnings(matchId)', returns: 'void', description: 'Ends current innings, transitions to INNINGS_BREAK or starts second innings' },
          { name: 'completeMatch(matchId)', returns: 'MatchResult', description: 'Determines winner based on scores, updates stats' },
        ],
      },
      {
        name: 'Match',
        description: 'A cricket match between two teams. Manages innings, current score, match state, and result.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique match identifier' },
          { name: 'teams', type: 'List<Team>', description: 'Two competing teams' },
          { name: 'venue', type: 'String', description: 'Stadium/city where match is played' },
          { name: 'format', type: 'MatchFormat', description: 'ODI (50 overs), T20 (20 overs), TEST (unlimited)' },
          { name: 'status', type: 'MatchStatus', description: 'UPCOMING, LIVE, INNINGS_BREAK, COMPLETED, ABANDONED' },
          { name: 'innings', type: 'List<Innings>', description: 'Completed and current innings' },
          { name: 'currentInnings', type: 'Innings', description: 'Innings currently in progress (null during breaks)' },
          { name: 'tossWinner', type: 'Team', description: 'Team that won the toss' },
          { name: 'tossChoice', type: 'String', description: 'BAT or FIELD — elected by toss winner' },
        ],
        methods: [
          { name: 'startInnings(battingTeam, bowlingTeam)', returns: 'Innings', description: 'Begins a new innings' },
          { name: 'addBall(ball)', returns: 'void', description: 'Records a ball in the current innings' },
          { name: 'getCurrentScore()', returns: 'Score', description: 'Returns current match score summary' },
        ],
      },
      {
        name: 'Innings',
        description: 'One team\'s batting innings. Tracks runs, wickets, overs, extras, batting/bowling stats, and fall of wickets.',
        fields: [
          { name: 'battingTeam', type: 'Team', description: 'Team currently batting' },
          { name: 'bowlingTeam', type: 'Team', description: 'Team currently bowling' },
          { name: 'totalRuns', type: 'int', description: 'Total runs scored in this innings' },
          { name: 'wicketsLost', type: 'int', description: 'Number of wickets fallen' },
          { name: 'totalOvers', type: 'double', description: 'Overs bowled (e.g., 47.3 = 47 overs + 3 balls)' },
          { name: 'balls', type: 'List<Ball>', description: 'All balls bowled in this innings' },
          { name: 'battingStats', type: 'Map<Player, BattingStat>', description: 'Batting statistics per player' },
          { name: 'bowlingStats', type: 'Map<Player, BowlingStat>', description: 'Bowling statistics per player' },
          { name: 'extras', type: 'Extras', description: 'Byes, leg byes, wides, no balls, penalties' },
          { name: 'fallOfWickets', type: 'List<Wicket>', description: 'Each wicket with score, over, and dismissal type' },
        ],
        methods: [
          { name: 'addBall(ball)', returns: 'void', description: 'Records a ball and updates all stats' },
          { name: 'isInningsComplete()', returns: 'boolean', description: 'Checks if innings is over (all out or overs exhausted)' },
        ],
      },
      {
        name: 'Ball',
        description: 'A single delivery bowled. Records runs, wicket type (if any), extras, and which batsman faced it.',
        fields: [
          { name: 'overNumber', type: 'int', description: 'Over number (1-indexed)' },
          { name: 'ballNumber', type: 'int', description: 'Ball number within the over (1-6)' },
          { name: 'bowler', type: 'Player', description: 'Player who bowled this delivery' },
          { name: 'batsman', type: 'Player', description: 'Player who faced this delivery' },
          { name: 'runs', type: 'int', description: 'Runs scored off the bat (0-6)' },
          { name: 'extras', type: 'ExtraType', description: 'WIDE, NO_BALL, BYE, LEG_BYE, PENALTY — null if none' },
          { name: 'wicket', type: 'WicketType', description: 'BOWLED, CAUGHT, LBW, RUN_OUT, STUMPED — null if no wicket' },
          { name: 'isFour', type: 'boolean', description: 'True if the ball was hit for 4 runs' },
          { name: 'isSix', type: 'boolean', description: 'True if the ball was hit for 6 runs' },
        ],
        methods: [],
      },
      {
        name: 'Player',
        description: 'Cricket player with personal info and roles. Accumulates career statistics across all matches.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique player identifier' },
          { name: 'name', type: 'String', description: 'Full name' },
          { name: 'role', type: 'PlayerRole', description: 'BATSMAN, BOWLER, ALL_ROUNDER, WICKETKEEPER' },
          { name: 'battingStyle', type: 'String', description: 'RIGHT_HANDED or LEFT_HANDED' },
          { name: 'bowlingStyle', type: 'String', description: 'FAST, MEDIUM, SPIN' },
          { name: 'careerStats', type: 'CareerStats', description: 'Aggregate batting and bowling stats across all matches' },
        ],
        methods: [
          { name: 'updateCareerStats(matchStats)', returns: 'void', description: 'Updates career aggregates with match performance' },
          { name: 'getBattingAverage()', returns: 'double', description: 'Returns career batting average (runs / dismissals)' },
          { name: 'getBowlingAverage()', returns: 'double', description: 'Returns career bowling average (runs conceded / wickets)' },
        ],
      },
      {
        name: 'CommentaryService',
        description: 'Generates and manages ball-by-ball text commentary. Provides over summaries and key event highlights.',
        fields: [
          { name: 'comments', type: 'Map<String, List<Comment>>', description: 'Commentary entries grouped by match and innings' },
        ],
        methods: [
          { name: 'addComment(matchId, ball, text)', returns: 'void', description: 'Adds commentary text for a specific ball' },
          { name: 'getOverSummary(matchId, overNumber)', returns: 'String', description: 'Returns summary text for a completed over' },
          { name: 'getBallByBall(matchId)', returns: 'List<Comment>', description: 'Returns full ball-by-ball commentary for the match' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'ScoringService observes Ball events. When a ball is bowled, it updates Innings stats, player stats, and triggers commentary. Multiple observers update different views without Ball knowing about them.' },
      { name: 'Singleton', used: true, explanation: 'MatchService and ScoringService are singletons ensuring single source of truth for live match state. Prevents conflicting score updates.' },
      { name: 'State', used: true, explanation: 'MatchStatus enum (UPCOMING to LIVE to INNINGS_BREAK to LIVE to COMPLETED) implements State pattern. State determines valid operations for each match phase.' },
      { name: 'Strategy', used: false, explanation: 'Different match formats could use FormatStrategy defining max overs, follow-on rules, and draw conditions. Match would delegate to strategy instead of if-else on format type.' },
      { name: 'Command', used: false, explanation: 'Each ball could be a Command object encapsulating delivery data. Enables undo (score correction), replay, and DRS (review system) by reverting and reapplying balls.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Match manages match-level state. Innings tracks one team\'s batting. Ball records a single delivery. Player has career stats. CommentaryService generates text.' },
      { name: 'Open/Closed (OCP)', description: 'New match formats add a constant. New ball event types extend Ball model. New statistics computed from existing data. Core scoring and match flow unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'MatchService depends on ScoringService and CommentaryService abstractions. Match depends on Innings. Innings depends on Ball. Workflow doesn\'t depend on stat computation details.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Stat computation (batting average, economy, strike rate) centralized in Player and Innings. Commentary follows templates — not hand-written per ball.' },
      { name: 'KISS (Keep It Simple)', description: 'Cricket scoring: balls to runs/wickets to innings total to match result. Model follows natural flow. Each entity maps to real cricket concept.' },
    ],
    oopConcepts: [
      { name: 'Composition over Inheritance', description: 'Match has-a List of Innings, List of Team. Innings has-a List of Ball, Map of stats. Player has-a CareerStats. Cricket domain is a natural composition hierarchy.', alternative: 'Could create MatchWithInnings extending Match. Matches can have varying innings (ODI=2, Test=4), making fixed inheritance impractical.' },
      { name: 'Encapsulation — Stat Updates', description: 'Innings.addBall() encapsulates all stat updates — runs, wickets, batting/bowling stats, fall of wickets, extras, overs. External code just submits a Ball.', alternative: 'Could let external services update each stat separately. Encapsulation guarantees consistency — every ball updates ALL relevant stats atomically.' },
      { name: 'Polymorphism — Dismissal Types', description: 'WicketType enum drives different match events. Bowled affects bowler stats, Caught affects fielder, RunOut affects multiple fielders. Each has polymorphic behavior for stat updates.', alternative: 'Could use string field with if-else. Enum-based polymorphism captures distinct rules per dismissal type.' },
    ],
    extensibility: [
      { area: 'New Match Format', description: 'Add TheHundred (100-ball) as format constant. Define max balls per innings. Existing Innings and Ball models handle all formats.', difficulty: 'Easy' },
      { area: 'Live Score WebSocket', description: 'Push ball-by-ball updates to clients via WebSocket. CommentaryService publishes events for WebSocketHandler. Frontend updates in real-time without polling.', difficulty: 'Medium' },
      { area: 'Points Table / Series', description: 'Add Series entity with matches between teams. Points table with wins, losses, net run rate. Match results update series standings automatically.', difficulty: 'Medium' },
      { area: 'DRS / Review System', description: 'Add Review entity for umpire reviews. Each ball can have review with type, ball tracking data, outcome. Command pattern for balls enables reverting reviews.', difficulty: 'Hard' },
    ],
  },

  courseRegistration: {
    title: 'Course Registration — Design Details',
    requirements: [
      'Course catalog — courses with title, code, description, credits, prerequisites, and schedule (days, time, room)',
      'Student enrollment — students can view courses, register for courses, and drop registered courses within deadlines',
      'Registration workflow: DRAFT to SUBMITTED to APPROVED to ENROLLED to DROPPED — with REJECTED from SUBMITTED',
      'Prerequisite checking — system validates that students have completed prerequisite courses before enrollment',
      'Capacity management — courses have maximum enrollment; waitlist functionality when course is full',
      'Waitlist — students can join a waitlist for full courses; auto-enroll when a seat opens (FIFO)',
      'Conflicting schedule detection — system prevents enrollment in courses with overlapping time slots',
      'Professor assignment — courses are taught by professors who can view enrolled students and manage course materials',
    ],
    entities: [
      {
        name: 'RegistrationService',
        description: 'Core orchestrator managing registration lifecycle — course search, enrollment, dropping, and waitlist management.',
        fields: [
          { name: 'courseRepo', type: 'Repository<Course>', description: 'Data store for course catalog' },
          { name: 'studentRepo', type: 'Repository<Student>', description: 'Data store for student records' },
          { name: 'registrationRepo', type: 'Repository<Registration>', description: 'Data store for registrations' },
        ],
        methods: [
          { name: 'searchCourses(criteria)', returns: 'List<Course>', description: 'Searches courses by code, title, professor, department' },
          { name: 'enroll(studentId, courseId)', returns: 'Registration', description: 'Creates registration with prerequisite and conflict checks' },
          { name: 'dropCourse(registrationId)', returns: 'void', description: 'Drops enrollment, notifies next waitlisted student' },
          { name: 'approveRegistration(registrationId)', returns: 'void', description: 'Approves pending registration (admin/professor action)' },
          { name: 'rejectRegistration(registrationId, reason)', returns: 'void', description: 'Rejects registration with reason' },
        ],
      },
      {
        name: 'Course',
        description: 'Academic course with catalog info, schedule, capacity, prerequisites, and enrolled/waitlisted student lists.',
        fields: [
          { name: 'code', type: 'String', description: 'Unique course code (e.g., CS101)' },
          { name: 'title', type: 'String', description: 'Course title' },
          { name: 'description', type: 'String', description: 'Detailed course description' },
          { name: 'credits', type: 'int', description: 'Credit hours' },
          { name: 'professor', type: 'Professor', description: 'Instructor teaching the course' },
          { name: 'schedule', type: 'Schedule', description: 'Days, time, and room' },
          { name: 'capacity', type: 'int', description: 'Maximum number of enrolled students' },
          { name: 'prerequisites', type: 'List<Course>', description: 'Courses that must be completed before enrollment' },
          { name: 'enrolledStudents', type: 'List<Student>', description: 'Currently enrolled students' },
          { name: 'waitlist', type: 'Queue<Student>', description: 'Students waiting for an open seat (FIFO)' },
        ],
        methods: [
          { name: 'hasAvailableSeat()', returns: 'boolean', description: 'Checks if enrollment is below capacity' },
          { name: 'enrollStudent(student)', returns: 'boolean', description: 'Adds student if seat available, otherwise adds to waitlist' },
          { name: 'dropStudent(student)', returns: 'void', description: 'Removes student, auto-enrolls next from waitlist' },
          { name: 'checkPrerequisites(student)', returns: 'boolean', description: 'Validates all prerequisite courses are completed' },
          { name: 'checkScheduleConflict(student)', returns: 'boolean', description: 'Checks for overlapping time slots with student\'s other courses' },
        ],
      },
      {
        name: 'Student',
        description: 'Student with academic record, completed courses, current enrollments, and registration history.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique student identifier' },
          { name: 'name', type: 'String', description: 'Full name' },
          { name: 'department', type: 'String', description: 'Academic department/major' },
          { name: 'completedCourses', type: 'List<Course>', description: 'Courses passed with grade' },
          { name: 'currentCourses', type: 'List<Registration>', description: 'Currently enrolled courses' },
          { name: 'schedule', type: 'List<Schedule>', description: 'All time slots for current enrollments' },
        ],
        methods: [
          { name: 'hasCompleted(course)', returns: 'boolean', description: 'Checks if student has passed a prerequisite course' },
          { name: 'getEnrolledCredits()', returns: 'int', description: 'Returns total credits of current enrollments' },
        ],
      },
      {
        name: 'Registration',
        description: 'Enrollment record linking student to course. Tracks application status, approval, and grade.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique registration identifier' },
          { name: 'student', type: 'Student', description: 'Enrolled student' },
          { name: 'course', type: 'Course', description: 'Registered course' },
          { name: 'status', type: 'RegistrationStatus', description: 'DRAFT, SUBMITTED, APPROVED, ENROLLED, DROPPED, REJECTED' },
          { name: 'submittedAt', type: 'LocalDateTime', description: 'When registration was submitted' },
          { name: 'approvedAt', type: 'LocalDateTime', description: 'When registration was approved' },
        ],
        methods: [
          { name: 'submit()', returns: 'void', description: 'Submits registration for approval' },
          { name: 'approve()', returns: 'void', description: 'Approves registration' },
          { name: 'reject(reason)', returns: 'void', description: 'Rejects registration with reason' },
          { name: 'drop()', returns: 'void', description: 'Drops the course' },
        ],
      },
    ],
    designPatterns: [
      { name: 'State', used: true, explanation: 'RegistrationStatus enum with transitions: DRAFT to SUBMITTED to APPROVED to ENROLLED to DROPPED, with REJECTED from SUBMITTED. Each state determines valid operations.' },
      { name: 'Singleton', used: true, explanation: 'RegistrationService is a singleton ensuring a single source of truth for course capacity. Prevents over-enrollment from concurrent requests.' },
      { name: 'Observer', used: true, explanation: 'When a student drops a course, the waitlist observer is notified. The next waitlisted student is automatically enrolled. This decouples drop logic from waitlist logic.' },
      { name: 'Factory', used: false, explanation: 'A CourseFactory could create courses with default schedule templates, prerequisite chains, and capacity limits based on department and level.' },
      { name: 'Strategy', used: false, explanation: 'Different enrollment strategies (FirstComeFirstServed, MeritBased, LotteryBased) could be swapped via EnrollmentStrategy interface without changing RegistrationService.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Course manages catalog and capacity. Student manages academic record. Registration manages enrollment status. RegistrationService orchestrates workflow and validation.' },
      { name: 'Open/Closed (OCP)', description: 'New registration statuses add to enum with transitions. New enrollment strategies implement EnrollmentStrategy. New validation rules extend existing validation chain.' },
      { name: 'Dependency Inversion (DIP)', description: 'RegistrationService depends on Course and Student abstractions. Course depends on Schedule. High-level enrollment logic doesn\'t depend on low-level schedule representation.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Prerequisite checking is centralized in Course.checkPrerequisites(). Schedule conflict detection is in Course.checkScheduleConflict(). Waitlist FIFO logic is in Course.' },
      { name: 'KISS (Keep It Simple)', description: 'The registration model follows the natural academic workflow: draft, submit, approve, enroll, drop. Waitlist is a simple FIFO queue. No complex scheduling algorithms needed.' },
    ],
    oopConcepts: [
      { name: 'Encapsulation — Registration Status', description: 'Registration encapsulates its status with submit(), approve(), reject(), drop() methods that validate transitions. External code cannot set status directly.', alternative: 'Could expose setStatus(). Encapsulated transitions enforce academic workflow rules at model level.' },
      { name: 'Composition over Inheritance', description: 'Course has-a Schedule, List of prerequisites, List of enrolled students. Student has-a List of completed courses, List of current registrations. System composed of independent entities.', alternative: 'Could create hierarchy of course types (LectureCourse extends Course). Composition is chosen because courses vary in capacity and schedule, not category.' },
      { name: 'Polymorphism — Waitlist Behavior', description: 'Waitlist interface with FIFOWaitlist, PriorityWaitlist (seniors first), DepartmentWaitlist (same department gets priority). Course delegates waitlist management to the strategy.', alternative: 'Could use single Queue implementation. Polymorphic waitlist allows different fairness policies without changing Course.' },
    ],
    extensibility: [
      { area: 'New Enrollment Policy', description: 'Implement EnrollmentStrategy interface (FirstComeFirstServed, MeritBased with GPA sorting, LotteryBased). RegistrationService delegates without changing core workflow.', difficulty: 'Medium' },
      { area: 'Academic Calendar / Terms', description: 'Add Term entity with enrollment periods (early registration, regular, late with fees). Course gets term association. Registration validated against enrollment deadlines.', difficulty: 'Medium' },
      { area: 'Grade Management', description: 'Add Grade entity linked to Registration. Professors enter grades. Student transcript generated from completed registrations with grades. Existing models unchanged.', difficulty: 'Easy' },
      { area: 'Cross-Department Enrollment Limits', description: 'Add department enrollment quotas per course. Non-department students waitlisted if quota exceeded. Extends existing capacity management logic.', difficulty: 'Medium' },
    ],
  },

  stockBrokerage: {
    title: 'Stock Brokerage — Design Details',
    requirements: [
      'Account management — users can open trading accounts with balance, portfolio, and transaction history',
      'Market data ingestion — real-time stock prices, bid/ask spreads, and market indices from exchange feed',
      'Order placement — users can place BUY/SELL orders with order types: MARKET, LIMIT, STOP_LOSS',
      'Order matching engine — matches buy and sell orders by price-time priority, executes trades when orders cross',
      'Order states: PENDING, VALIDATED, PLACED, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED',
      'Portfolio tracking — user portfolio shows holdings with current P&L, average buy price, and allocation',
      'Portfolio and watchlist management — users can create watchlists, view portfolio performance charts',
      'Transaction history — complete audit trail of all trades, deposits, withdrawals with timestamps',
    ],
    entities: [
      {
        name: 'BrokerageService',
        description: 'Core orchestrator managing accounts, order placement, portfolio queries, and transaction recording.',
        fields: [
          { name: 'accountRepo', type: 'Repository<Account>', description: 'Data store for user accounts' },
          { name: 'orderRepo', type: 'Repository<Order>', description: 'Data store for all orders' },
          { name: 'matchingEngine', type: 'MatchingEngine', description: 'Executes order matching and trade execution' },
          { name: 'marketDataProvider', type: 'MarketDataProvider', description: 'Source of real-time stock prices' },
        ],
        methods: [
          { name: 'placeOrder(accountId, stock, quantity, type, price)', returns: 'Order', description: 'Validates and places a trade order' },
          { name: 'cancelOrder(orderId)', returns: 'void', description: 'Cancels an open order if not yet filled' },
          { name: 'getPortfolio(accountId)', returns: 'Portfolio', description: 'Returns current holdings with P&L' },
          { name: 'getOrderHistory(accountId)', returns: 'List<Order>', description: 'Returns all past orders for the account' },
        ],
      },
      {
        name: 'Account',
        description: 'User trading account with cash balance, portfolio holdings, and transaction log.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique account identifier' },
          { name: 'user', type: 'User', description: 'Account owner' },
          { name: 'balance', type: 'double', description: 'Available cash balance' },
          { name: 'holdings', type: 'Map<Stock, Integer>', description: 'Current stock holdings (stock to shares)' },
          { name: 'transactions', type: 'List<Transaction>', description: 'All deposits, withdrawals, and trades' },
        ],
        methods: [
          { name: 'deposit(amount)', returns: 'void', description: 'Adds cash to account balance' },
          { name: 'withdraw(amount)', returns: 'boolean', description: 'Withdraws cash if sufficient balance' },
          { name: 'getPortfolioValue()', returns: 'double', description: 'Calculates total value (cash + holdings market value)' },
        ],
      },
      {
        name: 'Order',
        description: 'Trade order to buy or sell a stock. Has type, status, price, quantity, and execution details.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique order identifier' },
          { name: 'account', type: 'Account', description: 'Account placing the order' },
          { name: 'stock', type: 'Stock', description: 'Stock symbol and company' },
          { name: 'side', type: 'OrderSide', description: 'BUY or SELL' },
          { name: 'type', type: 'OrderType', description: 'MARKET, LIMIT, STOP_LOSS' },
          { name: 'quantity', type: 'int', description: 'Number of shares' },
          { name: 'filledQuantity', type: 'int', description: 'Shares executed so far' },
          { name: 'price', type: 'double', description: 'Limit price (for LIMIT/STOP orders)' },
          { name: 'status', type: 'OrderStatus', description: 'PENDING, VALIDATED, PLACED, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED' },
          { name: 'timestamp', type: 'LocalDateTime', description: 'When the order was placed' },
        ],
        methods: [
          { name: 'fill(quantity, price)', returns: 'void', description: 'Executes a partial/full fill of the order' },
          { name: 'cancel()', returns: 'void', description: 'Cancels the order if not fully filled' },
          { name: 'isFilled()', returns: 'boolean', description: 'Returns true if all shares are executed' },
        ],
      },
      {
        name: 'MatchingEngine',
        description: 'Matches buy and sell orders by price-time priority. Maintains order books (bid/ask) per stock.',
        fields: [
          { name: 'orderBooks', type: 'Map<String, OrderBook>', description: 'Order book per stock symbol' },
        ],
        methods: [
          { name: 'placeOrder(order)', returns: 'Trade', description: 'Adds order to book and attempts matching. Returns trade if executed.' },
          { name: 'cancelOrder(orderId)', returns: 'void', description: 'Removes order from book' },
          { name: 'getOrderBook(stock)', returns: 'OrderBook', description: 'Returns current bid/ask levels for a stock' },
        ],
      },
      {
        name: 'OrderBook',
        description: 'Price-time prioritized list of buy and sell orders for a single stock. Buy orders sorted by price descending, sells by price ascending.',
        fields: [
          { name: 'stock', type: 'Stock', description: 'Stock this order book belongs to' },
          { name: 'bids', type: 'PriorityQueue<Order>', description: 'Buy orders (highest price first)' },
          { name: 'asks', type: 'PriorityQueue<Order>', description: 'Sell orders (lowest price first)' },
        ],
        methods: [
          { name: 'addOrder(order)', returns: 'void', description: 'Adds order to appropriate queue and attempts matching' },
          { name: 'match()', returns: 'List<Trade>', description: 'Matches bids and asks where bid price >= ask price' },
          { name: 'getBestBid()', returns: 'Order', description: 'Returns highest buy order' },
          { name: 'getBestAsk()', returns: 'Order', description: 'Returns lowest sell order' },
        ],
      },
      {
        name: 'Stock',
        description: 'Stock instrument with symbol, company name, current market price, and other metadata.',
        fields: [
          { name: 'symbol', type: 'String', description: 'Ticker symbol (e.g., AAPL, GOOGL)' },
          { name: 'companyName', type: 'String', description: 'Full company name' },
          { name: 'currentPrice', type: 'double', description: 'Last traded price' },
          { name: 'openPrice', type: 'double', description: 'Today\'s opening price' },
          { name: 'dayHigh', type: 'double', description: 'Today\'s highest price' },
          { name: 'dayLow', type: 'double', description: 'Today\'s lowest price' },
        ],
        methods: [
          { name: 'updatePrice(newPrice)', returns: 'void', description: 'Updates market price and triggers observers' },
          { name: 'getDayChange()', returns: 'double', description: 'Returns percentage change from open' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Observer', used: true, explanation: 'Market data provider observes exchange feed. When stock prices change, observers (portfolio P&L calculator, watchlist, alert system) are notified. Stock.updatePrice() notifies all registered observers.' },
      { name: 'Singleton', used: true, explanation: 'BrokerageService and MatchingEngine are singletons ensuring a single order book per stock. Critical for price-time priority matching — two concurrent orders must be serialized.' },
      { name: 'Strategy', used: true, explanation: 'Order matching strategy (PriceTimePriority vs ProRata vs Hybrid) implements MatchingStrategy. Order types (MARKET, LIMIT, STOP_LOSS) also use strategy — each validates and executes differently.' },
      { name: 'Factory', used: true, explanation: 'OrderFactory creates validated order instances based on type. MarketOrder, LimitOrder, StopLossOrder each have different validation and execution logic encapsulated by the factory.' },
      { name: 'Proxy', used: false, explanation: 'A MarketDataProxy could cache stock prices and provide stale-data-tolerant reads. Reduces load on exchange API while ensuring critical reads (order placement) get fresh data.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'Account manages balance and holdings. Order tracks trade request. MatchingEngine executes matching. OrderBook maintains bid/ask queues. Stock holds market data. Each has one job.' },
      { name: 'Open/Closed (OCP)', description: 'New order types implement Order interface with validation. New matching strategies implement MatchingStrategy. New market data sources implement MarketDataProvider. Core services unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'BrokerageService depends on MatchingEngine and MarketDataProvider abstractions. MatchingEngine depends on OrderBook. OrderBook depends on Order. High-level logic doesn\'t depend on low-level implementations.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Order validation (sufficient balance for BUY, sufficient holdings for SELL) is centralized in BrokerageService. Order book maintenance (add, remove, match) is in OrderBook.' },
      { name: 'KISS (Keep It Simple)', description: 'Price-time priority matching is the simplest fair matching algorithm. Order book is two priority queues (bids max-heap, asks min-heap). No complex auction or dark pool logic.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Order Types', description: 'Order interface with MarketOrder (executes at current price), LimitOrder (executes only at or better than limit), StopLossOrder (triggers market order when price hits stop). Each validates and executes differently.', alternative: 'Could use single Order class with type field and switch. Polymorphism encapsulates type-specific behavior cleanly.' },
      { name: 'Encapsulation — Order Book', description: 'OrderBook encapsulates bid/ask queues and matching logic. External code cannot directly add/remove from internal queues — must go through addOrder() and cancelOrder().', alternative: 'Could expose queues directly. Encapsulation ensures matching invariants (price-time priority) are maintained.' },
      { name: 'Composition over Inheritance', description: 'Account has-a Map of holdings, List of transactions. Order has-a Account and Stock. OrderBook has-a PriorityQueue of Orders. System built by composing entities.', alternative: 'Could create hierarchy of account types (BasicAccount extends Account). Composition is chosen because accounts differ in features, not behavior.' },
    ],
    extensibility: [
      { area: 'New Order Type', description: 'Implement Order interface (e.g., StopLimitOrder, TrailingStopOrder, IcebergOrder). Add to OrderFactory. MatchingEngine handles new types without modification.', difficulty: 'Medium' },
      { area: 'Real-time Market Data WebSocket', description: 'Connect to exchange WebSocket feed. MarketDataProvider pushes price updates to observers (portfolio, watchlists). Replaces polling with push-based updates.', difficulty: 'Medium' },
      { area: 'Margin Trading', description: 'Add margin account type with leverage, margin requirements, and interest calculation. Extends Account with borrowing capability. Collateral monitoring prevents margin call violations.', difficulty: 'Hard' },
      { area: 'Automated Trading / Alerts', description: 'Add Alert entity with conditions (price above/below, volume spike). AlertService monitors market data and triggers actions (email, SMS, auto-order). Existing order placement reused.', difficulty: 'Medium' },
    ],
  },

  musicStreaming: {
    title: 'Music Streaming — Design Details',
    requirements: [
      'Music catalog — songs with title, artist, album, genre, duration, and audio file URL',
      'User management — users can sign up, manage profile, and choose subscription plan (Free, Premium, Family)',
      'Playlist management — users create, edit, delete playlists, add/remove songs, and reorder tracks',
      'Music playback — stream songs with play, pause, skip, previous, seek, and shuffle/repeat controls',
      'Search functionality — search songs, artists, albums, and playlists with autocomplete and filtering',
      'Recommendations — personalized song recommendations based on listening history, liked songs, and genre preferences',
      'Subscription plans — Free (ads, skips limit, lower quality), Premium (no ads, unlimited skips, high quality), Family (multi-user)',
      'Offline downloads — premium users can download songs for offline listening with DRM protection',
    ],
    entities: [
      {
        name: 'StreamingService',
        description: 'Core orchestrator managing music catalog, playback, playlist management, search, and subscription handling.',
        fields: [
          { name: 'catalog', type: 'MusicCatalog', description: 'All songs, albums, and artists indexed for search' },
          { name: 'subscriptionManager', type: 'SubscriptionManager', description: 'Handles subscription plans and billing' },
          { name: 'recommendationEngine', type: 'RecommendationEngine', description: 'Generates personalized recommendations' },
          { name: 'downloadManager', type: 'DownloadManager', description: 'Manages offline downloads with DRM' },
        ],
        methods: [
          { name: 'search(query, type, filters)', returns: 'SearchResults', description: 'Searches songs, artists, albums, playlists' },
          { name: 'getRecommendations(userId)', returns: 'List<Song>', description: 'Returns personalized song recommendations' },
          { name: 'createPlaylist(userId, name)', returns: 'Playlist', description: 'Creates a new empty playlist' },
          { name: 'getStreamUrl(songId, userId)', returns: 'String', description: 'Returns signed audio stream URL (quality based on plan)' },
        ],
      },
      {
        name: 'User',
        description: 'Streaming service user with profile, subscription, playlists, listening history, and preferences.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique user identifier' },
          { name: 'name', type: 'String', description: 'Display name' },
          { name: 'subscription', type: 'Subscription', description: 'Current subscription plan and status' },
          { name: 'playlists', type: 'List<Playlist>', description: 'User-created playlists' },
          { name: 'likedSongs', type: 'List<Song>', description: 'Songs the user has liked' },
          { name: 'listeningHistory', type: 'List<ListenEvent>', description: 'Recently played songs for recommendations' },
          { name: 'downloadedSongs', type: 'List<Song>', description: 'Songs available offline (premium only)' },
        ],
        methods: [
          { name: 'likeSong(song)', returns: 'void', description: 'Adds song to liked songs list' },
          { name: 'unlikeSong(song)', returns: 'void', description: 'Removes song from liked songs' },
          { name: 'recordListen(song)', returns: 'void', description: 'Records a listen event for recommendations' },
          { name: 'downloadSong(song)', returns: 'boolean', description: 'Downloads song for offline playback (premium only)' },
        ],
      },
      {
        name: 'Song',
        description: 'Individual track with metadata, audio file, and streaming/DRM information.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique song identifier' },
          { name: 'title', type: 'String', description: 'Song title' },
          { name: 'artist', type: 'Artist', description: 'Performing artist' },
          { name: 'album', type: 'Album', description: 'Album this song belongs to' },
          { name: 'genre', type: 'Genre', description: 'Music genre (POP, ROCK, JAZZ, CLASSICAL, HIP_HOP)' },
          { name: 'duration', type: 'int', description: 'Duration in seconds' },
          { name: 'audioUrl', type: 'String', description: 'Streaming URL for audio file' },
          { name: 'trackNumber', type: 'int', description: 'Track position in the album' },
        ],
        methods: [],
      },
      {
        name: 'Playlist',
        description: 'Ordered collection of songs created by a user. Supports public/private visibility and collaborative editing.',
        fields: [
          { name: 'id', type: 'String', description: 'Unique playlist identifier' },
          { name: 'name', type: 'String', description: 'Playlist name' },
          { name: 'owner', type: 'User', description: 'User who created the playlist' },
          { name: 'songs', type: 'List<Song>', description: 'Ordered list of songs' },
          { name: 'isPublic', type: 'boolean', description: 'Whether the playlist is visible to other users' },
          { name: 'collaborators', type: 'List<User>', description: 'Users who can edit this playlist' },
          { name: 'createdAt', type: 'LocalDateTime', description: 'Creation timestamp' },
        ],
        methods: [
          { name: 'addSong(song, position)', returns: 'void', description: 'Adds a song at specified position (or end)' },
          { name: 'removeSong(songId)', returns: 'void', description: 'Removes a song from the playlist' },
          { name: 'reorder(songId, newPosition)', returns: 'void', description: 'Moves a song to a new position' },
          { name: 'shuffle()', returns: 'void', description: 'Randomly reorders all songs' },
        ],
      },
      {
        name: 'Subscription',
        description: 'Subscription plan with features, billing details, and access controls for content quality and offline use.',
        fields: [
          { name: 'plan', type: 'SubscriptionPlan', description: 'FREE, PREMIUM, FAMILY' },
          { name: 'active', type: 'boolean', description: 'Whether subscription is currently active' },
          { name: 'startDate', type: 'LocalDate', description: 'Subscription start date' },
          { name: 'renewalDate', type: 'LocalDate', description: 'Next billing date' },
          { name: 'maxDevices', type: 'int', description: 'Maximum simultaneous streams' },
        ],
        methods: [
          { name: 'canStreamHighQuality()', returns: 'boolean', description: 'Returns true for premium plans' },
          { name: 'canDownloadOffline()', returns: 'boolean', description: 'Returns true for premium plans' },
          { name: 'getAdFree()', returns: 'boolean', description: 'Returns true for premium plans' },
        ],
      },
      {
        name: 'RecommendationEngine',
        description: 'Generates personalized song recommendations using collaborative filtering, genre affinity, and listening history analysis.',
        fields: [
          { name: 'strategies', type: 'List<RecommendationStrategy>', description: 'Multiple recommendation algorithms combined' },
        ],
        methods: [
          { name: 'getRecommendations(user, limit)', returns: 'List<Song>', description: 'Returns personalized song recommendations' },
          { name: 'getSimilarSongs(song, limit)', returns: 'List<Song>', description: 'Finds songs similar to a given song' },
          { name: 'getTrendingSongs(genre, limit)', returns: 'List<Song>', description: 'Returns trending songs globally or by genre' },
        ],
      },
    ],
    designPatterns: [
      { name: 'Strategy', used: true, explanation: 'PricingStrategy interface with FreePlan (ads, skips limit), PremiumPlan (no ads, high quality), FamilyPlan (multi-user, shared pricing). StreamingService delegates feature access and pricing to the strategy.' },
      { name: 'Singleton', used: true, explanation: 'StreamingService, MusicCatalog, and RecommendationEngine are singletons ensuring consistent catalog, recommendations, and subscription state across all users.' },
      { name: 'Factory', used: true, explanation: 'PlaylistFactory creates playlists with proper owner, timestamps, and privacy defaults. RecommendationStrategyFactory assembles the recommendation pipeline with weighted strategies.' },
      { name: 'Observer', used: true, explanation: 'When a user listens to a song, ListeningHistoryService observes the event and updates listening history. RecommendationEngine observes these events to refine future recommendations.' },
      { name: 'Proxy', used: false, explanation: 'A StreamProxy could enforce subscription-based quality limits. Free users get 128kbps stream, Premium users get lossless FLAC. The proxy intercepts stream requests and serves the appropriate quality.' },
    ],
    principles: [
      { name: 'Single Responsibility (SRP)', description: 'StreamingService orchestrates. Song holds track metadata. Playlist manages song order. User handles profile and history. Subscription defines access. RecommendationEngine suggests songs.' },
      { name: 'Open/Closed (OCP)', description: 'New subscription plans implement SubscriptionPlan interface. New recommendation strategies implement RecommendationStrategy. New audio quality levels can be added. Core streaming unchanged.' },
      { name: 'Dependency Inversion (DIP)', description: 'StreamingService depends on SubscriptionPlan and RecommendationStrategy abstractions. User depends on Song and Playlist abstractions. High-level services don\'t depend on low-level implementations.' },
      { name: 'DRY (Don\'t Repeat Yourself)', description: 'Feature access logic (canStream, canDownload) is centralized in Subscription plans. Audio streaming quality logic is in one place. Recommendation scoring is in RecommendationEngine.' },
      { name: 'Liskov Substitution (LSP)', description: 'Any SubscriptionPlan (Free, Premium, Family) can substitute another without breaking StreamingService. Any RecommendationStrategy is interchangeable.' },
    ],
    oopConcepts: [
      { name: 'Polymorphism — Subscription Plans', description: 'StreamingService calls canStreamHighQuality(), canDownloadOffline() on SubscriptionPlan interface. FreePlan, PremiumPlan, FamilyPlan each implement feature access differently.', alternative: 'Could use boolean flags on User. Strategy pattern is chosen because plans have complex interdependencies (device limits, audio quality, ads) that are naturally encapsulated per plan.' },
      { name: 'Composition over Inheritance', description: 'User has-a Subscription, List of Playlist, List of Song (liked). Playlist has-a List of Song, List of User (collaborators). Song has-a Artist and Album. Domain is built by composing entities.', alternative: 'Could create PremiumUser extending User. Composition is chosen because subscription is a cross-cutting concern — users can change plans without changing identity.' },
      { name: 'Encapsulation — DRM / Offline Content', description: 'DownloadManager encapsulates DRM encryption and license management. Downloaded songs are encrypted and tied to the user\'s device. External code cannot access raw audio files.', alternative: 'Could store plain audio files with simple access control. Encapsulated DRM is chosen because content licensing requires encryption and device binding.' },
    ],
    extensibility: [
      { area: 'New Subscription Plan', description: 'Implement SubscriptionPlan interface (e.g., StudentPlan with discount, HiFiPlan with lossless audio). Existing feature checks work polymorphically without modifying StreamingService.', difficulty: 'Easy' },
      { area: 'Podcasts / Audio Books', description: 'Add Podcast and Episode entities extending Song-like structure. Podcast catalog integrates with search. Playback and playlist models work unchanged. Recommendation engine extended with podcast affinity.', difficulty: 'Medium' },
      { area: 'Social Features', description: 'Add shared playlists, friend activity feed, listening parties. Reuse existing User, Playlist, and Song models. New social graph built on existing entities.', difficulty: 'Medium' },
      { area: 'Recommendation Engine (ML)', description: 'Implement collaborative filtering or neural network-based recommendation strategy. User-song affinity matrix computed from listening history. Existing RecommendationStrategy interface accommodates new algorithms.', difficulty: 'Hard' },
    ],
  },

  zomato: {
    title: 'Zomato Food Delivery Service — Low-Level System Design',
    tldr: [
      'Multi-entity domain model supporting Customers, Restaurants, Menu Items, Delivery Agents, Orders, Payments, and Real-Time Notifications.',
      'State Machine order lifecycle: PLACED ➔ CONFIRMED ➔ PREPARING ➔ READY_FOR_PICKUP ➔ OUT_FOR_DELIVERY ➔ DELIVERED (or CANCELLED).',
      'Thread-safe ConcurrentHashMap repository protected by ReentrantLock for order state transitions.',
      '4-Digit OTP handoff verification between customer and delivery agent for secure delivery confirmation.',
      'Extensible payment processor supporting UPI, Credit Card, Debit Card, Wallet, and Cash on Delivery with auto-refund on cancellation.'
    ],
    requirements: [
      'Customers can browse restaurants, view categorized menus, configure order items, and select payment methods.',
      'Restaurants can manage menu items, toggle stock availability, and accept/prepare incoming orders.',
      'Delivery Agents can toggle online availability, accept assigned orders, and complete deliveries via 4-digit OTP handoff.',
      'The system handles state transitions concurrently ensuring thread safety during high order volume.',
      'Supports real-time notifications for status updates dispatched to customers, restaurants, and delivery agents.',
      'Supports automated payment processing and refund calculation upon cancellation.'
    ],
    entities: [
      { name: 'Customer', description: 'Represents a customer with ID, name, email, phone, and delivery address.' },
      { name: 'Restaurant', description: 'Represents a restaurant offering a categorized menu of food items.' },
      { name: 'MenuItem', description: 'Represents a menu item with name, price, category, veg/non-veg flag, and stock availability.' },
      { name: 'DeliveryAgent', description: 'Represents a delivery partner with vehicle registration, online status, and delivery count.' },
      { name: 'Order', description: 'Central entity tracking order items, customer, restaurant, assigned agent, status, and 4-digit OTP.' },
      { name: 'Payment', description: 'Tracks payment transaction reference, payment method, amount, and payment status.' },
      { name: 'Notification', description: 'Stores status update alerts sent to customers, restaurants, or delivery partners.' }
    ],
    designPatterns: [
      { name: 'State Pattern', used: true, explanation: 'Enforces strict state transitions for OrderStatus (PLACED ➔ CONFIRMED ➔ PREPARING ➔ READY_FOR_PICKUP ➔ OUT_FOR_DELIVERY ➔ DELIVERED).' },
      { name: 'Strategy Pattern', used: true, explanation: 'Encapsulates PaymentProcessor implementations (UPI, Card, Wallet, COD) allowing seamless extension.' },
      { name: 'Observer Pattern', used: true, explanation: 'Dispatches real-time Notifications to customer, kitchen, and driver on every order status change.' },
      { name: 'Factory Pattern', used: true, explanation: 'Creates initial seed data (Restaurants, Menu, Customers, Delivery Agents) during application initialization.' }
    ],
    principles: [
      { name: 'Single Responsibility Principle (SRP)', description: 'ZomatoService manages order lifecycle, ZomatoRepository handles thread-safe data persistence, and PaymentProcessor manages payments.' },
      { name: 'Open/Closed Principle (OCP)', description: 'New payment methods or assignment strategies can be added without altering existing order processing logic.' },
      { name: 'Interface Segregation Principle (ISP)', description: 'Entities expose targeted getters and state update methods appropriate for their domain boundary.' },
      { name: 'Dependency Inversion Principle (DIP)', description: 'High-level ZomatoService depends on repository abstractions rather than concrete storage mechanisms.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Order fields, status transitions, and secret OTP verification are encapsulated behind atomic service methods.' },
      { name: 'Abstraction', description: 'REST Controllers abstract backend thread safety and concurrency from frontend UI components.' },
      { name: 'Polymorphism', description: 'PaymentProcessor handles diverse payment methods using a unified processPayment() contract.' }
    ],
    extensibility: [
      { area: 'Geospatial Agent Matching', description: 'Integrate Haversine distance algorithm or QuadTree index to assign the nearest available delivery agent.', difficulty: 'Medium' },
      { area: 'Dynamic Surge Delivery Fee', description: 'Apply dynamic delivery fee pricing based on weather, demand peak hours, or distance.', difficulty: 'Medium' },
      { area: 'Scheduled Orders', description: 'Support advance order booking with scheduled kitchen dispatch timers.', difficulty: 'Easy' }
    ]
  },

  tictactoe: {
    title: 'Tic Tac Toe Game — Low-Level System Design',
    tldr: [
      'Multi-mode game engine supporting 2-Player local matches (Human vs Human) and AI Opponents (Human vs AI).',
      'Strategy Pattern for AI Move Generation encapsulating Random and Unbeatable Minimax search strategies.',
      'State Machine order lifecycle: IN_PROGRESS ➔ WON (with 2D line coordinate calculation) or DRAW.',
      'Thread-safe session isolation using ConcurrentHashMap repository protected by per-game ReentrantLock instances.',
      'Full move history log supporting Step-by-Step replay and atomic Undo functionality.'
    ],
    requirements: [
      'Players can configure 2-player local matches or play against an AI Bot with customizable difficulty levels.',
      'The board validates valid grid moves, turns, and auto-detects winning rows, columns, or diagonals.',
      'The engine computes exact winning cell coordinates (startRow, startCol, endRow, endCol) for visual highlight.',
      'Supports Step-by-Step move history tracking, match replay, and move undoing.',
      'Handles concurrent move execution safely across multiple simultaneous game sessions.'
    ],
    entities: [
      { name: 'Game', description: 'Core domain entity managing board grid, current turn player, game mode, difficulty, move count, and status.' },
      { name: 'Player', description: 'Represents a participant with player name and assigned symbol (X or O).' },
      { name: 'Move', description: 'Value object recording move index, player name, symbol, row/col coordinates, and timestamp.' },
      { name: 'AIMoveStrategy', description: 'Strategy interface computing optimal next move based on current game board state.' },
      { name: 'GameState', description: 'Enum tracking session lifecycle: IN_PROGRESS, WON, DRAW, ABANDONED.' },
      { name: 'GameMode', description: 'Enum specifying HUMAN_VS_HUMAN or HUMAN_VS_AI match types.' },
      { name: 'AIDifficulty', description: 'Enum defining AI strategy: EASY (Random) vs UNBEATABLE (Minimax algorithm).' }
    ],
    designPatterns: [
      { name: 'Strategy Pattern', used: true, explanation: 'Encapsulates AI move calculation algorithms (RandomAIMoveStrategy vs MinimaxAIMoveStrategy) selected dynamically based on difficulty.' },
      { name: 'State Pattern', used: true, explanation: 'Manages formal GameState transitions (IN_PROGRESS ➔ WON / DRAW) and prevents invalid moves after game termination.' },
      { name: 'Command Pattern', used: true, explanation: 'Encapsulates board moves as Move objects to support Undo functionality and move history replay.' },
      { name: 'Factory Pattern', used: true, explanation: 'Instantiates Game instances with appropriate player symbols and strategy objects.' }
    ],
    principles: [
      { name: 'Single Responsibility Principle (SRP)', description: 'TicTacToeService manages game state transitions, GameRepository handles storage, and AIMoveStrategy focuses exclusively on move calculation.' },
      { name: 'Open/Closed Principle (OCP)', description: 'New AI strategies (e.g. Monte Carlo Tree Search or N×N grid algorithms) can be plugged in without modifying core service logic.' },
      { name: 'Interface Segregation Principle (ISP)', description: 'AIMoveStrategy exposes a clean, targeted interface (findBestMove) for AI engines.' },
      { name: 'Dependency Inversion Principle (DIP)', description: 'Service relies on strategy abstractions rather than concrete Minimax implementations.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Board grid state, move validation rules, and winning line detection logic are encapsulated within atomic domain methods.' },
      { name: 'Abstraction', description: 'REST Controllers abstract backend concurrency locks and AI Minimax computation from frontend UI components.' },
      { name: 'Polymorphism', description: 'TicTacToeService invokes findBestMove() polymorphically regardless of whether the AI strategy is Random or Minimax.' }
    ],
    extensibility: [
      { area: 'N×N Customizable Grid Size', description: 'Extend board data structure and win checking strategy to support 4×4 or 5×5 grid sizes with configurable K-in-a-row win conditions.', difficulty: 'Medium' },
      { area: 'WebSocket Real-Time Multiplayer', description: 'Replace polling with STOMP/WebSocket topics for real-time remote 2-player matchmaking.', difficulty: 'Hard' },
      { area: 'Leaderboard & ELO Rating System', description: 'Track player win/loss statistics and compute dynamic ELO rating scores across games.', difficulty: 'Medium' }
    ]
  },
  lrucache: {
    title: 'LRU Cache System — Design Details',
    tldr: [
      'Production-grade in-memory cache system supporting thread-safe O(1) GET, PUT, REMOVE operations and configurable capacity',
      'Extensible Eviction Strategy pattern enabling dynamic runtime switching between LRU (Least Recently Used), LFU (Least Frequently Used), and FIFO algorithms',
      'Thread-safe storage combining ConcurrentHashMap for O(1) key lookups with a custom Doubly-Linked List guarded by ReentrantLock',
      'Real-time telemetry tracking (hits, misses, evictions, hit rate %) and 2D animated memory rack simulation'
    ],
    tradeoffs: [
      'Used custom Doubly-Linked List with Sentinel Head & Tail nodes to guarantee clean O(1) node detachment and head promotion without null checks.',
      'Guarded doubly-linked list mutations with ReentrantLock to prevent concurrency pointer corruption during simultaneous put/get operations.',
      'Decoupled EvictionPolicy into a Strategy interface to allow runtime swapping of eviction rules (LRU, LFU, FIFO) without clearing active cache data.',
      'Maintained in-memory operation logs to enable step-by-step history inspection and simulation replay.'
    ],
    requirements: [
      'Fixed & Dynamic Capacity: Configurable maximum cache capacity with dynamic resizing and automatic eviction of excess elements.',
      'O(1) Time Complexity: GET and PUT operations execute in constant time O(1).',
      'Eviction Policy: Automatically evicts least recently used item when capacity is exceeded.',
      'Strategy Pattern Extensibility: Easy to swap eviction policy (LRU, LFU, FIFO) at runtime.',
      'Thread Safety: High concurrency support using ConcurrentHashMap and fine-grained ReentrantLock.'
    ],
    entities: [
      { name: 'LruCache', description: 'Core cache engine class holding key-value mapping, doubly linked list pointers, lock manager, and metrics.' },
      { name: 'Node', description: 'Doubly linked list element storing key, value, prev/next references, access count, and timestamps.' },
      { name: 'EvictionPolicy', description: 'Strategy interface defining keyAccessed, keyInserted, evictKey, removeKey, and getOrderedNodes.' },
      { name: 'LRUEvictionPolicy', description: 'LRU strategy maintaining Sentinel Head (MRU) and Sentinel Tail (LRU) for O(1) access and eviction.' },
      { name: 'LFUEvictionPolicy', description: 'LFU strategy tracking access counts to evict least frequently used nodes.' },
      { name: 'FIFOEvictionPolicy', description: 'FIFO strategy evicting nodes based strictly on insertion creation timestamp.' }
    ],
    designPatterns: [
      { name: 'Strategy Pattern', used: true, explanation: 'Encapsulates eviction logic behind EvictionPolicy interface, allowing seamless runtime swapping of LRU, LFU, and FIFO strategies.' },
      { name: 'Doubly Linked List', used: true, explanation: 'Enables constant time O(1) removal of arbitrary nodes and promotion to HEAD.' },
      { name: 'Lock Manager / Concurrency Lock', used: true, explanation: 'ReentrantLock ensures atomic thread safety across map and linked list pointer modifications.' }
    ],
    principles: [
      { name: 'Single Responsibility Principle (SRP)', description: 'LruCache handles cache coordination, Node manages item payload, and EvictionPolicy focuses strictly on eviction ordering.' },
      { name: 'Open/Closed Principle (OCP)', description: 'New eviction strategies (e.g. ARC or 2Q) can be implemented without modifying LruCache core code.' },
      { name: 'Dependency Inversion Principle (DIP)', description: 'LruCache depends on EvictionPolicy abstraction rather than concrete LRUEvictionPolicy.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Internal list pointer updates and concurrency locks are strictly encapsulated within LruCache methods.' },
      { name: 'Abstraction', description: 'REST API exposes clean GET, PUT, REMOVE endpoints without exposing pointer manipulation details.' },
      { name: 'Polymorphism', description: 'LruCache invokes eviction policy methods polymorphically regardless of active strategy.' }
    ],
    extensibility: [
      { area: 'TTL (Time-To-Live) Expiration Engine', description: 'Add background thread or lazy expiry check to invalidate stale cache nodes after TTL duration.', difficulty: 'Medium' },
      { area: 'Distributed Cache Synchronization', description: 'Integrate Redis pub-sub or Raft consensus algorithm for multi-node distributed cache invalidate messages.', difficulty: 'Hard' }
    ]
  },
  'lru-cache': {
    title: 'LRU Cache System — Design Details',
    tldr: [
      'Production-grade in-memory cache system supporting thread-safe O(1) GET, PUT, REMOVE operations and configurable capacity',
      'Extensible Eviction Strategy pattern enabling dynamic runtime switching between LRU (Least Recently Used), LFU (Least Frequently Used), and FIFO algorithms',
      'Thread-safe storage combining ConcurrentHashMap for O(1) key lookups with a custom Doubly-Linked List guarded by ReentrantLock',
      'Real-time telemetry tracking (hits, misses, evictions, hit rate %) and 2D animated memory rack simulation'
    ],
    tradeoffs: [
      'Used custom Doubly-Linked List with Sentinel Head & Tail nodes to guarantee clean O(1) node detachment and head promotion without null checks.',
      'Guarded doubly-linked list mutations with ReentrantLock to prevent concurrency pointer corruption during simultaneous put/get operations.',
      'Decoupled EvictionPolicy into a Strategy interface to allow runtime swapping of eviction rules (LRU, LFU, FIFO) without clearing active cache data.',
      'Maintained in-memory operation logs to enable step-by-step history inspection and simulation replay.'
    ],
    requirements: [
      'Fixed & Dynamic Capacity: Configurable maximum cache capacity with dynamic resizing and automatic eviction of excess elements.',
      'O(1) Time Complexity: GET and PUT operations execute in constant time O(1).',
      'Eviction Policy: Automatically evicts least recently used item when capacity is exceeded.',
      'Strategy Pattern Extensibility: Easy to swap eviction policy (LRU, LFU, FIFO) at runtime.',
      'Thread Safety: High concurrency support using ConcurrentHashMap and fine-grained ReentrantLock.'
    ],
    entities: [
      { name: 'LruCache', description: 'Core cache engine class holding key-value mapping, doubly linked list pointers, lock manager, and metrics.' },
      { name: 'Node', description: 'Doubly linked list element storing key, value, prev/next references, access count, and timestamps.' },
      { name: 'EvictionPolicy', description: 'Strategy interface defining keyAccessed, keyInserted, evictKey, removeKey, and getOrderedNodes.' },
      { name: 'LRUEvictionPolicy', description: 'LRU strategy maintaining Sentinel Head (MRU) and Sentinel Tail (LRU) for O(1) access and eviction.' },
      { name: 'LFUEvictionPolicy', description: 'LFU strategy tracking access counts to evict least frequently used nodes.' },
      { name: 'FIFOEvictionPolicy', description: 'FIFO strategy evicting nodes based strictly on insertion creation timestamp.' }
    ],
    designPatterns: [
      { name: 'Strategy Pattern', used: true, explanation: 'Encapsulates eviction logic behind EvictionPolicy interface, allowing seamless runtime swapping of LRU, LFU, and FIFO strategies.' },
      { name: 'Doubly Linked List', used: true, explanation: 'Enables constant time O(1) removal of arbitrary nodes and promotion to HEAD.' },
      { name: 'Lock Manager / Concurrency Lock', used: true, explanation: 'ReentrantLock ensures atomic thread safety across map and linked list pointer modifications.' }
    ],
    principles: [
      { name: 'Single Responsibility Principle (SRP)', description: 'LruCache handles cache coordination, Node manages item payload, and EvictionPolicy focuses strictly on eviction ordering.' },
      { name: 'Open/Closed Principle (OCP)', description: 'New eviction strategies (e.g. ARC or 2Q) can be implemented without modifying LruCache core code.' },
      { name: 'Dependency Inversion Principle (DIP)', description: 'LruCache depends on EvictionPolicy abstraction rather than concrete LRUEvictionPolicy.' }
    ],
    oopConcepts: [
      { name: 'Encapsulation', description: 'Internal list pointer updates and concurrency locks are strictly encapsulated within LruCache methods.' },
      { name: 'Abstraction', description: 'REST API exposes clean GET, PUT, REMOVE endpoints without exposing pointer manipulation details.' },
      { name: 'Polymorphism', description: 'LruCache invokes eviction policy methods polymorphically regardless of active strategy.' }
    ],
    extensibility: [
      { area: 'TTL (Time-To-Live) Expiration Engine', description: 'Add background thread or lazy expiry check to invalidate stale cache nodes after TTL duration.', difficulty: 'Medium' },
      { area: 'Distributed Cache Synchronization', description: 'Integrate Redis pub-sub or Raft consensus algorithm for multi-node distributed cache invalidate messages.', difficulty: 'Hard' }
    ]
  }
};

export default designDetails;

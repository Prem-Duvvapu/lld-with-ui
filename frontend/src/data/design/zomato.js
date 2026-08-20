// designDetails — zomato
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Zomato Food Delivery Service — Low-Level System Design',
  tldr: [
    'Multi-entity online food delivery service connecting Customers, Restaurants, and Delivery Agents',
    'Full order state machine lifecycle: PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED (or CANCELLED)',
    'Security-verified OTP delivery handoff (4-digit random OTP generated on order creation, verified by agent on delivery)',
    'Multi-payment support (UPI, Credit Card, Debit Card, NetBanking, COD, Wallet) with transaction status tracking & automatic refunds on cancellation',
    'Thread-safe in-memory ConcurrentHashMap repository guarded by ReentrantLock for high-concurrency order placement and agent matching',
    'Real-time Notification Service broadcasting events to Customer, Restaurant, and Delivery Agent'
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
        {
          name: 'repository',
          type: 'ZomatoRepository',
          description: 'Injected thread-safe repository'
        }
      ],
      methods: [
        {
          name: 'registerCustomer(...)',
          returns: 'Customer',
          description: 'Registers customer profile'
        },
        {
          name: 'getRestaurants()',
          returns: 'List<Restaurant>',
          description: 'Fetches list of all restaurants'
        },
        {
          name: 'updateMenuItemAvailability(...)',
          returns: 'Restaurant',
          description: 'Toggles item in-stock status'
        },
        {
          name: 'placeOrder(...)',
          returns: 'Order',
          description: 'Validates cart, processes payment, generates 4-digit OTP, creates order'
        },
        {
          name: 'confirmOrder(orderId)',
          returns: 'Order',
          description: 'Restaurant accepts incoming order'
        },
        {
          name: 'startPreparingOrder(orderId)',
          returns: 'Order',
          description: 'Kitchen begins cooking food'
        },
        {
          name: 'markReadyForPickup(orderId)',
          returns: 'Order',
          description: 'Kitchen completes food; matches & assigns available delivery agent'
        },
        {
          name: 'verifyOtpAndDeliver(orderId, otp)',
          returns: 'Order',
          description: 'Verifies customer OTP, marks DELIVERED, and frees delivery agent'
        },
        {
          name: 'cancelOrder(orderId, reason)',
          returns: 'Order',
          description: 'Cancels order prior to pickup, refunds payment, and notifies parties'
        }
      ]
    },
    {
      name: 'Customer',
      description: 'Represents a customer who browses menus and places orders.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique customer identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Customer full name'
        },
        {
          name: 'email',
          type: 'String',
          description: 'Email address'
        },
        {
          name: 'phone',
          type: 'String',
          description: 'Phone number'
        },
        {
          name: 'deliveryAddress',
          type: 'String',
          description: 'Primary delivery address'
        }
      ],
      methods: []
    },
    {
      name: 'Restaurant',
      description: 'Represents a food provider with address, rating, open status, and menu catalog.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique restaurant ID'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Restaurant name'
        },
        {
          name: 'address',
          type: 'String',
          description: 'Physical address'
        },
        {
          name: 'cuisine',
          type: 'String',
          description: 'Cuisine type (e.g. North Indian, Fast Food, Asian)'
        },
        {
          name: 'rating',
          type: 'double',
          description: 'Average rating out of 5.0'
        },
        {
          name: 'open',
          type: 'boolean',
          description: 'Operating status flag'
        },
        {
          name: 'menu',
          type: 'List<MenuItem>',
          description: 'List of menu items offered'
        }
      ],
      methods: [
        {
          name: 'addMenuItem(item)',
          returns: 'void',
          description: 'Adds new menu item'
        },
        {
          name: 'removeMenuItem(itemId)',
          returns: 'void',
          description: 'Removes item from menu'
        }
      ]
    },
    {
      name: 'MenuItem',
      description: 'Individual food item in a restaurant menu.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Menu item ID'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Item name'
        },
        {
          name: 'description',
          type: 'String',
          description: 'Ingredients & description'
        },
        {
          name: 'price',
          type: 'double',
          description: 'Unit price in ₹'
        },
        {
          name: 'category',
          type: 'String',
          description: 'Category (Burgers, Pizzas, Desserts, Beverages)'
        },
        {
          name: 'isVeg',
          type: 'boolean',
          description: 'Vegetarian indicator flag'
        },
        {
          name: 'available',
          type: 'boolean',
          description: 'Stock availability status'
        }
      ],
      methods: []
    },
    {
      name: 'Order',
      description: 'Core aggregate root representing a customer order, item breakdown, fees, payment, status, assigned agent, and secret OTP.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Order ID'
        },
        {
          name: 'customerId',
          type: 'String',
          description: 'Customer ID'
        },
        {
          name: 'restaurantId',
          type: 'String',
          description: 'Restaurant ID'
        },
        {
          name: 'items',
          type: 'List<OrderItem>',
          description: 'List of selected items & quantities'
        },
        {
          name: 'itemTotal',
          type: 'double',
          description: 'Subtotal price of items'
        },
        {
          name: 'deliveryFee',
          type: 'double',
          description: 'Delivery surcharge (₹35)'
        },
        {
          name: 'tax',
          type: 'double',
          description: 'GST Tax (5%)'
        },
        {
          name: 'totalAmount',
          type: 'double',
          description: 'Final payable amount'
        },
        {
          name: 'status',
          type: 'OrderStatus',
          description: 'Current state machine status'
        },
        {
          name: 'deliveryAgentId',
          type: 'String',
          description: 'Assigned delivery agent ID'
        },
        {
          name: 'payment',
          type: 'Payment',
          description: 'Associated payment transaction'
        },
        {
          name: 'deliveryOtp',
          type: 'String',
          description: '4-digit delivery verification OTP'
        }
      ],
      methods: []
    },
    {
      name: 'DeliveryAgent',
      description: 'Delivery partner with vehicle info, location, and availability state.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Agent ID'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Agent name'
        },
        {
          name: 'phone',
          type: 'String',
          description: 'Contact phone'
        },
        {
          name: 'vehicleNumber',
          type: 'String',
          description: 'Vehicle registration'
        },
        {
          name: 'available',
          type: 'boolean',
          description: 'Online/Available flag'
        },
        {
          name: 'totalDeliveries',
          type: 'int',
          description: 'Completed delivery counter'
        }
      ],
      methods: [
        {
          name: 'incrementDeliveries()',
          returns: 'void',
          description: 'Increments completed delivery count'
        }
      ]
    },
    {
      name: 'Payment',
      description: 'Payment transaction record with method, status, and transaction reference.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Payment ID'
        },
        {
          name: 'orderId',
          type: 'String',
          description: 'Associated order ID'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Transaction amount'
        },
        {
          name: 'paymentMethod',
          type: 'PaymentMethod',
          description: 'UPI, CREDIT_CARD, DEBIT_CARD, COD, WALLET'
        },
        {
          name: 'status',
          type: 'PaymentStatus',
          description: 'PENDING, COMPLETED, FAILED, REFUNDED'
        },
        {
          name: 'transactionRef',
          type: 'String',
          description: 'Bank transaction reference code'
        }
      ],
      methods: []
    },
    {
      name: 'Notification',
      description: 'Real-time notification record dispatched to stakeholders.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Notification ID'
        },
        {
          name: 'recipientType',
          type: 'String',
          description: 'CUSTOMER, RESTAURANT, AGENT'
        },
        {
          name: 'recipientId',
          type: 'String',
          description: 'Target recipient ID'
        },
        {
          name: 'orderId',
          type: 'String',
          description: 'Related order ID'
        },
        {
          name: 'message',
          type: 'String',
          description: 'Notification message body'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'ZomatoService serves as the central singleton service managing all domain operations.'
    },
    {
      name: 'State Machine Pattern',
      used: true,
      explanation: 'Order state transitions (PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED) enforced with guard conditions.'
    },
    {
      name: 'Factory Pattern',
      used: true,
      explanation: 'Generates unique IDs, 4-digit OTPs, and payment transaction references.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'ZomatoRepository abstracts memory storage behind clean CRUD operations.'
    },
    {
      name: 'Observer / Notification Pattern',
      used: true,
      explanation: 'Dispatches event notification records to Customer, Restaurant, and Agent channels upon state changes.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility Principle (SRP)',
      description: 'ZomatoService manages order lifecycle, ZomatoRepository handles thread-safe data persistence, and PaymentProcessor manages payments.'
    },
    {
      name: 'Open/Closed Principle (OCP)',
      description: 'New payment methods or assignment strategies can be added without altering existing order processing logic.'
    },
    {
      name: 'Interface Segregation Principle (ISP)',
      description: 'Entities expose targeted getters and state update methods appropriate for their domain boundary.'
    },
    {
      name: 'Dependency Inversion Principle (DIP)',
      description: 'High-level ZomatoService depends on repository abstractions rather than concrete storage mechanisms.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation',
      description: 'Order fields, status transitions, and secret OTP verification are encapsulated behind atomic service methods.'
    },
    {
      name: 'Abstraction',
      description: 'REST Controllers abstract backend thread safety and concurrency from frontend UI components.'
    },
    {
      name: 'Polymorphism',
      description: 'PaymentProcessor handles diverse payment methods using a unified processPayment() contract.'
    }
  ],
  extensibility: [
    {
      area: 'Geospatial Delivery Partner Assignment',
      description: 'Use Haversine formula to assign the nearest available delivery agent based on restaurant lat/lng coordinates.',
      difficulty: 'Medium'
    },
    {
      area: 'Promo Code & Discount Engine',
      description: 'Implement a DiscountStrategy interface for percentage off, flat discounts, or free delivery.',
      difficulty: 'Easy'
    },
    {
      area: 'Live GPS Scooter Animation',
      description: 'Stream real-time scooter coordinates between restaurant and customer address using WebSockets.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Used explicit OTP delivery verification to mirror real-world contactless/secure delivery handoffs.',
    'Decoupled agent assignment: if no delivery agent is online during READY_FOR_PICKUP, order remains queued until an agent comes online.',
    'In-memory ConcurrentHashMap + ReentrantLock chosen over external database for zero-latency SDE-2 interactive interview simulation.',
    'Synchronous payment authorization during placeOrder simplifies transaction guarantees while supporting immediate cancellation refunds.'
  ]
};

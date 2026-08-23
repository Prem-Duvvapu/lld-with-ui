// designDetails — restaurant
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Restaurant — Design Details',
  requirements: [
    'Menu management — multiple menu categories (appetizers, mains, desserts, beverages) each with items, prices, descriptions, and availability',
    'Table management — tables with capacity, location (indoor/outdoor), and status (AVAILABLE, RESERVED, OCCUPIED)',
    'Reservation system — customers can reserve tables for a specific date/time/party size with contact information',
    'Order placement — waiters create orders for occupied tables, add/remove items, and send orders to the kitchen',
    'Order status workflow: PLACED to PREPARING to READY to SERVED to BILLED — with optional CANCEL from PLACED state',
    'Kitchen display — chefs see pending orders sorted by time, mark items as PREPARING and READY',
    'Billing and payment — generate bill for table, split bill between customers, process payments (cash/card/digital)',
    'Multiple restaurant branches — each branch has its own menu, tables, staff, and orders'
  ],
  entities: [
    {
      name: 'RestaurantService',
      description: 'Core orchestrator managing tables, reservations, orders, and billing. Coordinates between kitchen and front-of-house staff.',
      fields: [
        {
          name: 'tables',
          type: 'Map<String, Table>',
          description: 'All tables in the restaurant indexed by number'
        },
        {
          name: 'menu',
          type: 'Menu',
          description: 'Full menu with categories and items'
        },
        {
          name: 'orders',
          type: 'Map<String, Order>',
          description: 'All active and completed orders'
        },
        {
          name: 'reservations',
          type: 'List<Reservation>',
          description: 'All upcoming and past reservations'
        }
      ],
      methods: [
        {
          name: 'reserveTable(customer, partySize, time)',
          returns: 'Reservation',
          description: 'Finds available table matching party size and time'
        },
        {
          name: 'createOrder(tableId, waiter)',
          returns: 'Order',
          description: 'Creates a new order for an occupied table'
        },
        {
          name: 'generateBill(tableId)',
          returns: 'Bill',
          description: 'Calculates total for all consumed items on the table'
        },
        {
          name: 'processPayment(bill, method)',
          returns: 'Payment',
          description: 'Processes payment and closes the bill'
        }
      ]
    },
    {
      name: 'Menu',
      description: 'Restaurant menu organized into categories (starters, mains, desserts, drinks). Each item has pricing, dietary info, and availability.',
      fields: [
        {
          name: 'categories',
          type: 'List<MenuCategory>',
          description: 'Menu sections like Appetizers, Main Course, Desserts'
        }
      ],
      methods: [
        {
          name: 'addItem(category, item)',
          returns: 'void',
          description: 'Adds a new item to the specified category'
        },
        {
          name: 'removeItem(itemId)',
          returns: 'void',
          description: 'Removes an item from the menu (sets unavailable)'
        },
        {
          name: 'getAvailableItems()',
          returns: 'List<MenuItem>',
          description: 'Returns all currently available menu items'
        }
      ]
    },
    {
      name: 'Order',
      description: 'Customer order for a specific table. Contains ordered items with quantities, special instructions, and status tracking per item.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique order identifier'
        },
        {
          name: 'table',
          type: 'Table',
          description: 'Table that placed the order'
        },
        {
          name: 'waiter',
          type: 'Staff',
          description: 'Waiter who took the order'
        },
        {
          name: 'items',
          type: 'List<OrderItem>',
          description: 'Ordered items with quantity and status'
        },
        {
          name: 'status',
          type: 'OrderStatus',
          description: 'PLACED, PREPARING, READY, SERVED, BILLED, CANCELLED'
        },
        {
          name: 'createdAt',
          type: 'LocalDateTime',
          description: 'When the order was placed'
        },
        {
          name: 'notes',
          type: 'String',
          description: 'Special instructions for the kitchen'
        }
      ],
      methods: [
        {
          name: 'addItem(menuItem, quantity)',
          returns: 'void',
          description: 'Adds an item to the order'
        },
        {
          name: 'removeItem(orderItemId)',
          returns: 'void',
          description: 'Removes an item (only if order is PLACED)'
        },
        {
          name: 'updateStatus(newStatus)',
          returns: 'boolean',
          description: 'Updates order status with state machine validation'
        }
      ]
    },
    {
      name: 'Table',
      description: 'Restaurant table with capacity, location, and current status. Tracks current order and reservation.',
      fields: [
        {
          name: 'number',
          type: 'String',
          description: 'Table identifier (e.g., T5, Patio-3)'
        },
        {
          name: 'capacity',
          type: 'int',
          description: 'Maximum number of seats'
        },
        {
          name: 'location',
          type: 'String',
          description: 'INDOOR, OUTDOOR, VIP, BAR'
        },
        {
          name: 'status',
          type: 'TableStatus',
          description: 'AVAILABLE, RESERVED, OCCUPIED'
        },
        {
          name: 'currentOrder',
          type: 'Order',
          description: 'Active order for this table (null if no order)'
        }
      ],
      methods: [
        {
          name: 'occupy()',
          returns: 'void',
          description: 'Marks table as OCCUPIED (from AVAILABLE or RESERVED)'
        },
        {
          name: 'release()',
          returns: 'void',
          description: 'Marks table as AVAILABLE after bill is paid'
        }
      ]
    },
    {
      name: 'KitchenService',
      description: 'Manages the kitchen display system. Chefs view pending orders, claim items for preparation, and mark them ready.',
      fields: [
        {
          name: 'pendingItems',
          type: 'Queue<OrderItem>',
          description: 'Items awaiting preparation, ordered by time'
        },
        {
          name: 'chefs',
          type: 'List<Staff>',
          description: 'Chefs currently working in the kitchen'
        }
      ],
      methods: [
        {
          name: 'viewPendingOrders()',
          returns: 'List<Order>',
          description: 'Returns orders sorted by time with PREPARING or PLACED items'
        },
        {
          name: 'startPreparation(orderItemId, chef)',
          returns: 'void',
          description: 'Chef claims an item and starts preparing'
        },
        {
          name: 'markReady(orderItemId)',
          returns: 'void',
          description: 'Marks prepared item as READY for serving'
        }
      ]
    },
    {
      name: 'Bill',
      description: 'Itemized bill for a table\'s consumption. Supports split bills, discounts, service charge, and tax calculations.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique bill identifier'
        },
        {
          name: 'table',
          type: 'Table',
          description: 'Table this bill belongs to'
        },
        {
          name: 'items',
          type: 'List<BillItem>',
          description: 'All consumed items with prices'
        },
        {
          name: 'subtotal',
          type: 'double',
          description: 'Sum of all item prices before tax and discounts'
        },
        {
          name: 'tax',
          type: 'double',
          description: 'Applicable tax amount'
        },
        {
          name: 'serviceCharge',
          type: 'double',
          description: 'Service charge (if applicable)'
        },
        {
          name: 'total',
          type: 'double',
          description: 'Final amount after all additions'
        },
        {
          name: 'isPaid',
          type: 'boolean',
          description: 'Whether the bill has been fully paid'
        }
      ],
      methods: [
        {
          name: 'addItem(item)',
          returns: 'void',
          description: 'Adds a menu item to the bill'
        },
        {
          name: 'calculateTotal()',
          returns: 'double',
          description: 'Computes subtotal + tax + service charge'
        },
        {
          name: 'split(numberOfPeople)',
          returns: 'List<Bill>',
          description: 'Splits the bill equally among specified number of people'
        },
        {
          name: 'applyDiscount(percentage)',
          returns: 'void',
          description: 'Applies a discount percentage to the total'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'OrderStatus enum with state machine: PLACED to PREPARING to READY to SERVED to BILLED, with CANCEL from PLACED/PREPARING. TableStatus also follows state pattern (AVAILABLE to RESERVED to OCCUPIED to AVAILABLE).'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'RestaurantService and KitchenService are singletons ensuring single view of orders, tables, and reservations. Critical for avoiding double-booking tables.'
    },
    {
      name: 'Observer',
      used: true,
      explanation: 'KitchenService observes new orders. When waiter places order, kitchen display updates automatically. Chefs notified of new items. Status changes also notify waiters when items are READY.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'OrderFactory creates orders with proper initial state, unique IDs, and timestamps. BillFactory generates itemized bills from order items.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'BillingStrategy (STANDARD vs HAPPY_HOUR_20%) is picked by BillingStrategyFactory.forTime() and computes the discount/tax/service breakdown, so RestaurantService never hard-codes the pricing rule.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Menu manages food catalog. Order handles items and status. Table manages seating. KitchenService handles prep workflow. RestaurantService coordinates. Bill handles payment.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New menu item types extend MenuItem. New order statuses add to enum. New payment methods implement PaymentGateway. Core workflow remains closed.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'RestaurantService depends on Menu, Table, Order abstractions. Payment processing depends on PaymentGateway abstraction. High-level modules don\'t depend on low-level details.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Table availability is in RestaurantService. Order status validation is in Order entity. Bill calculation is in Bill.calculateTotal(). No duplication across services.'
    },
    {
      name: 'Law of Demeter',
      description: 'Waiter doesn\'t modify OrderItem directly — calls Order.updateStatus(). Chef goes through KitchenService. Objects only talk to immediate neighbors.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Order Status',
      description: 'Order encapsulates status with updateStatus() enforcing valid transitions. PLACED to SERVED rejected (must go through PREPARING to READY). CANCEL from SERVED rejected.',
      alternative: 'Could expose setStatus(). Encapsulated transitions enforce workflow rules at model level.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Order has-a List of OrderItem. Table has-a current Order. Menu has-a List of MenuCategory, which has-a List of MenuItem. Everything is composed.',
      alternative: 'Could create BaseOrder class hierarchy. Composition is chosen because entities have diverse relationships.'
    },
    {
      name: 'Polymorphism — Payment Methods',
      description: 'PaymentService processes via PaymentMethod interface. CashPayment, CardPayment, DigitalPayment each implement processPayment() differently.',
      alternative: 'Could use type flag with switch. Polymorphism is chosen because each method has different validation steps.'
    }
  ],
  extensibility: [
    {
      area: 'Online Ordering / Takeaway',
      description: 'Add TakeawayOrder that doesn\'t require table assignment. Extends Order with pickup time. Kitchen workflow unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'Table Side Ordering (QR)',
      description: 'Customers scan QR to view menu and order directly. New OrderSource field tracks online vs. waiter orders. Existing order workflow unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Inventory Management',
      description: 'Link MenuItem to Ingredient list with stock levels. Reduce ingredient stock on order. Alert when low. Existing menu and order models unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Kitchen Display Integration',
      description: 'Connect to physical kitchen display via WebSocket. KitchenService pushes real-time updates (new orders, status changes) to screens.',
      difficulty: 'Medium'
    }
  ]
};

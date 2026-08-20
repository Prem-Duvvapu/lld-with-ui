// classDiagrams — zomato
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Zomato Food Delivery Service — Class Diagram',
  classes: [
    {
      name: 'ZomatoService',
      stereotype: 'singleton',
      fields: [
        '- repository: ZomatoRepository'
      ],
      methods: [
        '+ registerCustomer(name, email, phone, addr): Customer',
        '+ getRestaurants(): List<Restaurant>',
        '+ updateMenuItemAvailability(restId, itemId, avail): Restaurant',
        '+ placeOrder(custId, restId, items, addr, payMethod): Order',
        '+ confirmOrder(orderId): Order',
        '+ startPreparingOrder(orderId): Order',
        '+ markReadyForPickup(orderId): Order',
        '+ verifyOtpAndDeliver(orderId, otp): Order',
        '+ cancelOrder(orderId, reason): Order'
      ]
    },
    {
      name: 'Customer',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- phone: String',
        '- deliveryAddress: String'
      ],
      methods: [
        '+ getId()',
        '+ getDeliveryAddress()'
      ]
    },
    {
      name: 'Restaurant',
      fields: [
        '- id: String',
        '- name: String',
        '- address: String',
        '- cuisine: String',
        '- rating: double',
        '- open: boolean',
        '- menu: List<MenuItem>'
      ],
      methods: [
        '+ addMenuItem(item): void',
        '+ removeMenuItem(itemId): void',
        '+ getMenuItem(itemId): MenuItem'
      ]
    },
    {
      name: 'MenuItem',
      fields: [
        '- id: String',
        '- name: String',
        '- description: String',
        '- price: double',
        '- category: String',
        '- isVeg: boolean',
        '- available: boolean'
      ],
      methods: [
        '+ isAvailable(): boolean',
        '+ setAvailable(b): void'
      ]
    },
    {
      name: 'Order',
      fields: [
        '- id: String',
        '- customerId: String',
        '- restaurantId: String',
        '- items: List<OrderItem>',
        '- itemTotal: double',
        '- deliveryFee: double',
        '- tax: double',
        '- totalAmount: double',
        '- status: OrderStatus',
        '- deliveryAgentId: String',
        '- payment: Payment',
        '- deliveryOtp: String'
      ],
      methods: [
        '+ setStatus(status): void',
        '+ setDeliveryAgentId(id): void'
      ]
    },
    {
      name: 'OrderItem',
      fields: [
        '- itemId: String',
        '- name: String',
        '- price: double',
        '- quantity: int',
        '- specialInstructions: String'
      ],
      methods: [
        '+ getPrice()',
        '+ getQuantity()'
      ]
    },
    {
      name: 'DeliveryAgent',
      fields: [
        '- id: String',
        '- name: String',
        '- phone: String',
        '- vehicleNumber: String',
        '- available: boolean',
        '- totalDeliveries: int'
      ],
      methods: [
        '+ isAvailable(): boolean',
        '+ incrementDeliveries(): void'
      ]
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- orderId: String',
        '- amount: double',
        '- paymentMethod: PaymentMethod',
        '- status: PaymentStatus',
        '- transactionRef: String'
      ],
      methods: [
        '+ setStatus(status): void'
      ]
    },
    {
      name: 'Notification',
      fields: [
        '- id: String',
        '- recipientType: String',
        '- recipientId: String',
        '- orderId: String',
        '- message: String',
        '- timestamp: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'OrderStatus',
      stereotype: 'enum',
      fields: [
        'PLACED',
        'CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED'
      ],
      methods: []
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      fields: [
        'UPI',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'CASH_ON_DELIVERY',
        'WALLET'
      ],
      methods: []
    },
    {
      name: 'PaymentStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'COMPLETED',
        'FAILED',
        'REFUNDED'
      ],
      methods: []
    },
    {
      name: 'ZomatoRepository',
      fields: [
        '- customers: ConcurrentHashMap',
        '- restaurants: ConcurrentHashMap',
        '- deliveryAgents: ConcurrentHashMap',
        '- orders: ConcurrentHashMap',
        '- notifications: SynchronizedList',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ saveOrder(order): void',
        '+ getOrdersByCustomer(id): List',
        '+ getAvailableDeliveryAgents(): List'
      ]
    }
  ],
  relationships: [
    {
      from: 'ZomatoService',
      to: 'ZomatoRepository',
      label: 'uses'
    },
    {
      from: 'ZomatoService',
      to: 'Order',
      label: 'manages lifecycle'
    },
    {
      from: 'ZomatoRepository',
      to: 'Customer',
      label: 'stores'
    },
    {
      from: 'ZomatoRepository',
      to: 'Restaurant',
      label: 'stores'
    },
    {
      from: 'ZomatoRepository',
      to: 'DeliveryAgent',
      label: 'stores'
    },
    {
      from: 'ZomatoRepository',
      to: 'Order',
      label: 'stores & locks'
    },
    {
      from: 'Order',
      to: 'Customer',
      label: 'placed by'
    },
    {
      from: 'Order',
      to: 'Restaurant',
      label: 'placed at'
    },
    {
      from: 'Order',
      to: 'OrderItem',
      label: 'contains list'
    },
    {
      from: 'OrderItem',
      to: 'MenuItem',
      label: 'references'
    },
    {
      from: 'Restaurant',
      to: 'MenuItem',
      label: 'has menu items'
    },
    {
      from: 'Order',
      to: 'DeliveryAgent',
      label: 'assigned to'
    },
    {
      from: 'Order',
      to: 'Payment',
      label: 'has payment'
    },
    {
      from: 'Order',
      to: 'OrderStatus',
      label: 'has status'
    },
    {
      from: 'Payment',
      to: 'PaymentMethod',
      label: 'uses method'
    },
    {
      from: 'Payment',
      to: 'PaymentStatus',
      label: 'has status'
    },
    {
      from: 'ZomatoService',
      to: 'Notification',
      label: 'dispatches'
    }
  ]
};

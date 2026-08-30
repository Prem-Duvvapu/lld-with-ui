// classDiagrams — restaurant
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — the previous version described a fictional
// Menu/Table/Reservation system (a Menu aggregate, a KitchenService with a pendingItems Queue and
// a chefs list, a Bill with split()/applyDiscount(), a reservation feature, multi-branch support)
// that does not exist anywhere in com.lld.restaurant. The real module has no reservation concept
// and no Menu aggregate at all: it's a table/order/kitchen/billing domain built around
// RestaurantTable, Order/OrderItem, per-table ReentrantLocks in TableAllocationService, an
// order-level (not per-item) kitchen workflow in KitchenService, and a time-of-day BillingStrategy.

export default {
  title: 'Restaurant Management System — Class Diagram',
  classes: [
    {
      name: 'RestaurantService',
      fields: [
        '- repository: RestaurantRepository',
        '- tableAllocationService: TableAllocationService',
        '- kitchenService: KitchenService'
      ],
      methods: [
        '+ getTables(): List<RestaurantTable>',
        '+ getMenu(): List<MenuItem>',
        '+ seatGuests(tableId, partySize): RestaurantTable',
        '+ placeOrder(tableId, waiterName, lines, notes): Order',
        '+ cancelOrder(orderId): Order',
        '+ generateBill(orderId): Bill',
        '+ payBill(billId, method): Payment'
      ]
    },
    {
      name: 'TableAllocationService',
      fields: [
        '- repository: RestaurantRepository',
        '- tableLocks: ConcurrentHashMap<String, ReentrantLock>'
      ],
      methods: [
        '+ occupy(tableId, partySize): RestaurantTable',
        '+ release(tableId): void',
        '+ findAvailable(partySize): List<RestaurantTable>'
      ]
    },
    {
      name: 'KitchenService',
      fields: [
        '- repository: RestaurantRepository'
      ],
      methods: [
        '+ pendingOrders(): List<Order>',
        '+ startPreparation(orderId): Order',
        '+ markReady(orderId): Order',
        '+ markServed(orderId): Order'
      ]
    },
    {
      name: 'RestaurantRepository',
      fields: [
        '- tables: ConcurrentMap<String, RestaurantTable>',
        '- menuItems: ConcurrentMap<String, MenuItem>',
        '- orders: ConcurrentMap<String, Order>',
        '- bills: ConcurrentMap<String, Bill>',
        '- payments: ConcurrentMap<String, Payment>',
        '- staff: ConcurrentMap<String, Staff>'
      ],
      methods: [
        '+ findAllTables(): List<RestaurantTable>',
        '+ saveTable(table): RestaurantTable',
        '+ findAllMenuItems(): List<MenuItem>',
        '+ findOrderById(id): Optional<Order>',
        '+ saveOrder(order): Order',
        '+ saveBill(bill): Bill',
        '+ savePayment(payment): Payment'
      ]
    },
    {
      name: 'RestaurantTable',
      fields: [
        '- id: String',
        '- number: int',
        '- capacity: int',
        '- status: TableStatus',
        '- currentOrderId: String'
      ],
      methods: []
    },
    {
      name: 'TableStatus',
      stereotype: 'enum',
      fields: [
        'AVAILABLE',
        'RESERVED',
        'OCCUPIED'
      ],
      methods: []
    },
    {
      name: 'MenuItem',
      fields: [
        '- id: String',
        '- name: String',
        '- category: MenuCategory',
        '- price: double',
        '- available: boolean'
      ],
      methods: []
    },
    {
      name: 'MenuCategory',
      stereotype: 'enum',
      fields: [
        'APPETIZER',
        'MAIN',
        'DESSERT',
        'BEVERAGE'
      ],
      methods: []
    },
    {
      name: 'Order',
      fields: [
        '- id: String',
        '- tableId: String',
        '- waiterName: String',
        '- items: List<OrderItem>',
        '- status: OrderStatus',
        '- notes: String',
        '- subtotal: double'
      ],
      methods: []
    },
    {
      name: 'OrderItem',
      fields: [
        '- menuItemId: String',
        '- name: String',
        '- quantity: int',
        '- unitPrice: double',
        '- totalPrice: double'
      ],
      methods: []
    },
    {
      name: 'OrderStatus',
      stereotype: 'enum',
      fields: [
        'PLACED',
        'PREPARING',
        'READY',
        'SERVED',
        'BILLED',
        'CANCELLED'
      ],
      methods: []
    },
    {
      name: 'Bill',
      fields: [
        '- id: String',
        '- orderId: String',
        '- tableId: String',
        '- subtotal: double',
        '- discount: double',
        '- tax: double',
        '- serviceCharge: double',
        '- total: double',
        '- strategyUsed: String',
        '- paid: boolean'
      ],
      methods: []
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- billId: String',
        '- orderId: String',
        '- amount: double',
        '- method: PaymentMethod',
        '- status: PaymentStatus'
      ],
      methods: []
    },
    {
      name: 'PaymentMethod',
      stereotype: 'enum',
      fields: [
        'CASH',
        'CARD',
        'UPI'
      ],
      methods: []
    },
    {
      name: 'PaymentStatus',
      stereotype: 'enum',
      fields: [
        'SUCCESS',
        'FAILED'
      ],
      methods: []
    },
    {
      name: 'Staff',
      fields: [
        '- id: String',
        '- name: String',
        '- role: StaffRole',
        '- active: boolean'
      ],
      methods: []
    },
    {
      name: 'StaffRole',
      stereotype: 'enum',
      fields: [
        'WAITER',
        'CHEF'
      ],
      methods: []
    },
    {
      name: 'BillingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getName(): String',
        '+ compute(subtotal): BillBreakdown'
      ]
    },
    {
      name: 'StandardBillingStrategy',
      fields: [
        'implements BillingStrategy'
      ],
      methods: [
        '+ compute(subtotal): BillBreakdown'
      ]
    },
    {
      name: 'HappyHourBillingStrategy',
      fields: [
        'implements BillingStrategy'
      ],
      methods: [
        '+ compute(subtotal): BillBreakdown'
      ]
    },
    {
      name: 'BillingStrategyFactory',
      fields: [],
      methods: [
        '+ forTime(time): BillingStrategy'
      ]
    },
    {
      name: 'BillBreakdown',
      fields: [
        'subtotal: double',
        'discount: double',
        'tax: double',
        'serviceCharge: double',
        'total: double'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'RestaurantService', to: 'RestaurantRepository', label: 'uses' },
    { from: 'RestaurantService', to: 'TableAllocationService', label: 'uses' },
    { from: 'RestaurantService', to: 'KitchenService', label: 'uses' },
    { from: 'RestaurantService', to: 'BillingStrategyFactory', label: 'resolves pricing via' },
    { from: 'TableAllocationService', to: 'RestaurantRepository', label: 'uses' },
    { from: 'TableAllocationService', to: 'RestaurantTable', label: 'locks per-table & mutates' },
    { from: 'KitchenService', to: 'RestaurantRepository', label: 'uses' },
    { from: 'KitchenService', to: 'Order', label: 'transitions status of' },
    { from: 'RestaurantRepository', to: 'RestaurantTable', label: 'stores' },
    { from: 'RestaurantRepository', to: 'MenuItem', label: 'stores' },
    { from: 'RestaurantRepository', to: 'Order', label: 'stores' },
    { from: 'RestaurantRepository', to: 'Bill', label: 'stores' },
    { from: 'RestaurantRepository', to: 'Payment', label: 'stores' },
    { from: 'RestaurantRepository', to: 'Staff', label: 'stores' },
    { from: 'RestaurantTable', to: 'TableStatus', label: 'has status' },
    { from: 'MenuItem', to: 'MenuCategory', label: 'has category' },
    { from: 'Order', to: 'OrderItem', label: 'contains' },
    { from: 'Order', to: 'OrderStatus', label: 'has status' },
    { from: 'Bill', to: 'Payment', label: 'settled by' },
    { from: 'Payment', to: 'PaymentMethod', label: 'has method' },
    { from: 'Payment', to: 'PaymentStatus', label: 'has status' },
    { from: 'Staff', to: 'StaffRole', label: 'has role' },
    { from: 'BillingStrategyFactory', to: 'BillingStrategy', label: 'resolves to' },
    { from: 'StandardBillingStrategy', to: 'BillingStrategy', label: 'implements', dashed: true },
    { from: 'HappyHourBillingStrategy', to: 'BillingStrategy', label: 'implements', dashed: true },
    { from: 'BillingStrategy', to: 'BillBreakdown', label: 'returns' }
  ]
};

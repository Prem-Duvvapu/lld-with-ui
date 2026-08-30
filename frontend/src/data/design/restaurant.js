// designDetails — restaurant
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — the previous version described a fictional
// Menu/Table/Reservation system (a Menu aggregate, per-item kitchen tracking with a pendingItems
// Queue, Bill.split()/applyDiscount(), a reservation feature, multi-branch support, a Singleton
// RestaurantService/KitchenService) that does not exist anywhere in com.lld.restaurant. The real
// module has no reservation concept and no Menu aggregate: it's a table/order/kitchen/billing
// domain built around RestaurantTable, Order/OrderItem, per-table ReentrantLocks in
// TableAllocationService, an order-level (not per-item) kitchen workflow in KitchenService, and a
// time-of-day BillingStrategy — this part of the old file was accidentally correct and is kept.

export default {
  title: 'Restaurant Management System — Design Details',
  requirements: [
    'Table management — fixed set of tables with capacity, each with a status (AVAILABLE, RESERVED, OCCUPIED) and a reference to its current order',
    'Seating — seatGuests() occupies a table for a party, rejecting a party larger than the table\'s capacity or a table that is already OCCUPIED',
    'Menu catalog — flat list of MenuItem, each with a MenuCategory (APPETIZER/MAIN/DESSERT/BEVERAGE), a price, and an availability flag',
    'Order placement — a waiter places an order against an OCCUPIED table from a list of (menuItemId, quantity) lines; unavailable or unknown items are rejected',
    'Order lifecycle: PLACED → PREPARING → READY → SERVED → BILLED, with CANCELLED reachable only from PLACED or PREPARING — every other transition is rejected by OrderStatus\'s own transition table',
    'Kitchen workflow — KitchenService moves an order as a whole through PREPARING/READY/SERVED; there is no per-item kitchen tracking',
    'Billing — generateBill() requires the order to be SERVED, then prices the subtotal through whichever BillingStrategy matches the current time of day',
    'Payment — payBill() records a Payment against an unpaid Bill and releases the table back to AVAILABLE',
    'Thread-safe seating — two waiters racing to seat different parties at the same table must produce exactly one winner, the other rejected, never a double-booked table'
  ],
  entities: [
    {
      name: 'RestaurantService',
      description: 'Facade coordinating table allocation, order placement/cancellation, and billing/payment. Delegates table-occupancy locking to TableAllocationService and order-status transitions to KitchenService rather than owning either itself.',
      fields: [
        {
          name: 'repository',
          type: 'RestaurantRepository',
          description: 'Table/menu/order/bill/payment/staff storage, injected via constructor'
        },
        {
          name: 'tableAllocationService',
          type: 'TableAllocationService',
          description: 'Owns the per-table ReentrantLock used by seatGuests() and by payBill()\'s table release'
        },
        {
          name: 'kitchenService',
          type: 'KitchenService',
          description: 'Owns the order-status transition table used by the kitchen-facing sim endpoints'
        }
      ],
      methods: [
        {
          name: 'seatGuests(tableId, partySize)',
          returns: 'RestaurantTable',
          description: 'Delegates to TableAllocationService.occupy(); rejects a party over capacity or a table that is not AVAILABLE/RESERVED'
        },
        {
          name: 'placeOrder(tableId, waiterName, lines, notes)',
          returns: 'Order',
          description: 'Validates the table is OCCUPIED and every line references an available menu item, prices each line, and saves a new PLACED order'
        },
        {
          name: 'cancelOrder(orderId)',
          returns: 'Order',
          description: 'Transitions to CANCELLED only if OrderStatus.canTransitionTo(CANCELLED) allows it from the order\'s current status'
        },
        {
          name: 'generateBill(orderId)',
          returns: 'Bill',
          description: 'Requires the order to be SERVED, moves it to BILLED, then prices the subtotal via BillingStrategyFactory.forTime(now)'
        },
        {
          name: 'payBill(billId, method)',
          returns: 'Payment',
          description: 'Rejects an already-paid bill, records the Payment, marks the Bill paid, and releases the table via TableAllocationService.release()'
        }
      ]
    },
    {
      name: 'TableAllocationService',
      description: 'Owns table-occupancy concurrency control: one ReentrantLock per tableId, lazily created via computeIfAbsent, so seating two different tables never contends and seating the same table always serializes.',
      fields: [
        {
          name: 'tableLocks',
          type: 'ConcurrentHashMap<String, ReentrantLock>',
          description: 'Per-table lock, created on first access and reused for every subsequent occupy()/release() on that table'
        }
      ],
      methods: [
        {
          name: 'occupy(tableId, partySize)',
          returns: 'RestaurantTable',
          description: 'Under the table\'s lock: rejects a table that is not AVAILABLE/RESERVED and a party larger than capacity, otherwise marks it OCCUPIED'
        },
        {
          name: 'release(tableId)',
          returns: 'void',
          description: 'Under the table\'s lock: resets status to AVAILABLE and clears currentOrderId'
        }
      ]
    },
    {
      name: 'KitchenService',
      description: 'Order-level (not per-item) kitchen workflow. Every transition goes through OrderStatus.canTransitionTo(), so a kitchen action on a CANCELLED or already-SERVED order is rejected rather than silently applied.',
      fields: [],
      methods: [
        {
          name: 'pendingOrders()',
          returns: 'List<Order>',
          description: 'Orders in PLACED or PREPARING, oldest first — what a kitchen display would show'
        },
        {
          name: 'startPreparation(orderId) / markReady(orderId) / markServed(orderId)',
          returns: 'Order',
          description: 'Each calls the same private transition() helper with a different target OrderStatus, rejecting the move if the current status disallows it'
        }
      ]
    },
    {
      name: 'RestaurantRepository',
      description: 'In-memory storage for every restaurant aggregate. Seeds 6 tables and a 12-item menu across all four MenuCategory values on construction.',
      fields: [
        {
          name: 'tables, menuItems, orders, bills, payments, staff',
          type: 'ConcurrentMap<String, T>',
          description: 'One map per aggregate type, keyed by its generated id'
        },
        {
          name: 'orderSeq, billSeq, paymentSeq',
          type: 'AtomicLong',
          description: 'Backs generateOrderId()/generateBillId()/generatePaymentId() (ORD-00001, BILL-00001, PAY-00001 style)'
        }
      ],
      methods: []
    },
    {
      name: 'BillingStrategy',
      description: 'Strategy interface for computing a BillBreakdown (discount/tax/service-charge/total) from a subtotal. BillingStrategyFactory.forTime() picks StandardBillingStrategy or HappyHourBillingStrategy purely from the hour of day (16:00–18:00 inclusive gets happy-hour pricing), so RestaurantService never encodes a pricing rule itself.',
      fields: [],
      methods: [
        {
          name: 'compute(subtotal)',
          returns: 'BillBreakdown',
          description: 'Implemented by StandardBillingStrategy and HappyHourBillingStrategy, each with its own discount/tax/service-charge math'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy',
      used: true,
      explanation: 'BillingStrategy (StandardBillingStrategy vs. HappyHourBillingStrategy) is selected by BillingStrategyFactory.forTime(LocalTime) purely from the current hour, so generateBill() never hard-codes a discount/tax rule.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'OrderStatus and TableStatus each declare their own legal-transition map (canTransitionTo/allowedNext) rather than leaving each service method to re-derive which source statuses it should accept — the exact bug RCA-032-style incidents elsewhere in this repo fixed by centralizing.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'RestaurantRepository is the only class touching the six ConcurrentHashMaps; RestaurantService, TableAllocationService, and KitchenService all go through it rather than holding their own storage.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'RestaurantService is the single entry point the controller calls; it composes TableAllocationService and KitchenService rather than the controller wiring both directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'TableAllocationService owns table-occupancy locking only. KitchenService owns order-status transitions only. RestaurantRepository owns storage only. RestaurantService composes the three for the order/billing workflow.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new pricing rule (e.g. a weekend surcharge) is a new BillingStrategy implementation plus one more branch in BillingStrategyFactory.forTime() — RestaurantService.generateBill() does not change.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'placeOrderIn()/generateBillIn()/payBillIn() are shared private helpers parameterized on which RestaurantRepository to use, so the live endpoints and the /sim/* sandbox endpoints run the identical validation and pricing logic instead of two copies that could drift apart.'
    },
    {
      name: 'Encapsulation',
      description: 'OrderStatus/TableStatus keep their transition tables private static final maps, exposing only canTransitionTo()/allowedNext() — callers can never bypass the rule by comparing enum ordinals themselves.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Status Transition Tables',
      description: 'OrderStatus and TableStatus each hold a private Map<Status, Set<Status>> and expose only canTransitionTo()/allowedNext(); RestaurantService and KitchenService call canTransitionTo() before every mutation instead of switching on the enum themselves.',
      alternative: 'Could let each service method decide which source statuses it accepts, as an earlier revision of this module did — that duplicated (and silently drifted) the same rule across every call site.'
    },
    {
      name: 'Composition — Service Delegation',
      description: 'RestaurantService has-a TableAllocationService and has-a KitchenService rather than inheriting from either; each collaborator can be tested and reasoned about independently of the others.',
      alternative: 'Could fold table-locking and kitchen-transition logic directly into RestaurantService as private methods — composition keeps each concern in its own class with its own unit tests.'
    },
    {
      name: 'Polymorphism — BillingStrategy',
      description: 'RestaurantService.generateBill() calls strategy.compute(subtotal) against the BillingStrategy interface; StandardBillingStrategy and HappyHourBillingStrategy each implement the discount/tax math differently.',
      alternative: 'Could use an if/else or switch on the current hour inline in generateBill() — polymorphism keeps each pricing rule\'s math in its own class.'
    }
  ],
  extensibility: [
    {
      area: 'Split Billing',
      description: 'Add a splitBill(billId, n) that divides an existing Bill\'s total across n Payment records instead of one — Bill and Payment already model amount independently of Order, so this needs no change to the order or table workflow.',
      difficulty: 'Medium'
    },
    {
      area: 'Reservations',
      description: 'Add a Reservation model (tableId, guestName, time, partySize) and a ReservationService that calls TableAllocationService.occupy() at the reserved time — the real module has no reservation concept today, so this is new, not an extension of an existing one.',
      difficulty: 'Medium'
    },
    {
      area: 'Per-Item Kitchen Tracking',
      description: 'Today KitchenService transitions a whole Order at once. Splitting to per-OrderItem status would mean OrderItem gaining its own status field and KitchenService recomputing the Order\'s aggregate status from its items — a real model change, not just a new method.',
      difficulty: 'Hard'
    },
    {
      area: 'Loyalty Discounts',
      description: 'A new LoyaltyBillingStrategy implementing BillingStrategy, selected by a customer-tier lookup instead of time-of-day — BillingStrategyFactory would need a second resolution path alongside forTime().',
      difficulty: 'Easy'
    }
  ]
};

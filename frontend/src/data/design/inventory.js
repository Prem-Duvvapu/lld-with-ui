// designDetails — inventory
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Inventory Management — Design Details',
  requirements: [
    'Product catalog with SKU, category, pricing, stock levels, and reorder thresholds',
    'Stock movements: INBOUND (restock), OUTBOUND (sale), TRANSFER (warehouse to warehouse) — an OUTBOUND/TRANSFER that would take stock negative is rejected',
    'Crossing-based stock alerts: LOW_STOCK fires once when stock crosses at or below the reorder level, OUT_OF_STOCK fires on hitting zero, RESTOCKED fires on crossing back above the level — not on every mutation while already in that state',
    'Three interchangeable reorder policies (MIN_RESTOCK, EOQ, URGENT_BUFFER) a buyer can trigger per product',
    'Thread-safe concurrent stock updates — a per-product lock guarantees two concurrent sales of the last unit cannot both succeed',
    'Isolated simulation sandbox (/api/inventory/sim/*) so the interactive demo, including a live N-buyers-race, never touches live stock data',
    'Supplier management — each product linked to a supplier for procurement tracking'
  ],
  entities: [
    {
      name: 'InventoryService',
      description: 'Facade owning all business logic. Live and sim mutations both funnel through one private doUpdateStock() so validation, stock arithmetic and crossing-detection alerts can never drift between the two paths — the same shared-path idiom course-registration and restaurant use.',
      fields: [
        {
          name: 'repository / simRepository',
          type: 'InventoryRepository',
          description: 'Live store, and a second isolated store swapped in on simReset()'
        },
        {
          name: 'productLocks',
          type: 'ConcurrentHashMap<Long, ReentrantLock>',
          description: 'One fair lock per product, created via computeIfAbsent; never more than one held at a time, so no ordering rule is needed'
        },
        {
          name: 'notifier / simNotifier',
          type: 'StockAlertNotifier',
          description: 'The Observer subject each mutation path publishes alerts through'
        },
        {
          name: 'reorderFactory',
          type: 'ReorderStrategyFactory',
          description: 'Resolves a ReorderPolicy to its ReorderStrategy implementation'
        }
      ],
      methods: [
        { name: 'addProduct(product)', returns: 'Product', description: 'Validates SKU and non-negative levels, assigns an id' },
        { name: 'updateStock(productId, qty, type, reason)', returns: 'StockMovement', description: 'The one live stock-mutation entrypoint — locked, validated, crossing-detected' },
        { name: 'reorder(productId, policy)', returns: 'StockMovement', description: 'Resolves the strategy, computes quantity, applies it as an INBOUND movement, under the same product lock' },
        { name: 'getLowStockItems(threshold)', returns: 'List<Product>', description: 'Products with currentStock <= threshold' },
        { name: 'transferStock(productId, from, to, qty)', returns: 'StockMovement', description: 'A TRANSFER movement — arithmetic identical to an OUTBOUND sale' },
        { name: 'simRace(productId, buyers)', returns: 'Map', description: 'Fires `buyers` concurrent single-unit purchases via a CountDownLatch against the sim sandbox; returns exactly how many succeeded/were rejected and the final stock' }
      ]
    },
    {
      name: 'StockAlertNotifier',
      description: 'Observer Subject. Fans every StockAlert out to a CopyOnWriteArrayList<StockAlertObserver> so publish never locks and one misbehaving observer cannot break the rest.',
      fields: [
        { name: 'observers', type: 'CopyOnWriteArrayList<StockAlertObserver>', description: 'Every registered observer; Spring injects the live set, the sim sandbox constructs fresh instances' }
      ],
      methods: [
        { name: 'publish(alert)', returns: 'void', description: 'Notifies every observer, catching and logging any individual failure' }
      ]
    },
    {
      name: 'StockAlertObserver (interface)',
      description: 'Two independent implementations subscribe to the same event stream without knowing about each other: InAppStockAlertObserver (queryable feed backing GET /alerts, bounded to 100) and LoggingStockAlertObserver (writes to the server log).'
    },
    {
      name: 'ReorderStrategy (interface)',
      description: 'Three implementations resolved by ReorderStrategyFactory via an EnumMap — the same shape as splitwise’s SplitStrategyFactory. MinRestockStrategy orders exactly the shortfall to the reorder level (rejects if already at/above it). EoqReorderStrategy computes the classic Harris economic-order-quantity lot size, ceil(sqrt(2DS/H)), deterministic per product. UrgentBufferReorderStrategy targets 5× the reorder level on a true stock-out, 3× otherwise, always at least 1 unit.'
    },
    {
      name: 'InventoryRepository',
      description: 'In-memory store: ConcurrentHashMap for products/suppliers/movements, a bounded ArrayDeque event log (200 entries), and its own internal lock guarding the non-thread-safe collections — separate from InventoryService’s per-product locks, which guard the stock arithmetic itself.',
      fields: [
        { name: 'products', type: 'ConcurrentHashMap<Long, Product>', description: 'Product catalog indexed by ID' },
        { name: 'movements', type: 'ConcurrentHashMap<Long, List<StockMovement>>', description: 'Stock movements indexed by productId' },
        { name: 'events', type: 'Deque<InventoryEvent>', description: 'Bounded audit log, oldest evicted first' }
      ]
    },
    {
      name: 'StockAlert',
      description: 'One Observer-fanned-out event: which product, what crossing (LOW_STOCK / OUT_OF_STOCK / RESTOCKED / REORDER_PLACED), the stock level and movement that caused it.'
    },
    {
      name: 'StockMovement',
      description: 'Records every stock change with type, quantity, timestamp, reason, and reference ID for full audit trail.',
      fields: [
        { name: 'type', type: 'StockMovementType', value: 'INBOUND | OUTBOUND | TRANSFER', description: 'Direction of stock movement' },
        { name: 'quantity', type: 'int', description: 'Number of units moved (always positive)' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      description: 'StockAlertNotifier (Subject) fans every StockAlert out to independent StockAlertObserver implementations (in-app feed, server log) — the textbook fit this module always claimed but never had until this pass.'
    },
    {
      name: 'Strategy + Factory',
      used: true,
      description: 'ReorderStrategyFactory resolves MIN_RESTOCK / EOQ / URGENT_BUFFER to their ReorderStrategy implementation via an EnumMap; InventoryService never branches on the policy itself.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      description: 'InventoryRepository abstracts data storage behind a clean interface. Service never touches the underlying maps directly.'
    },
    {
      name: 'Facade',
      used: true,
      description: 'InventoryService is the single entrypoint for every mutation; live and sim paths share one internal doUpdateStock() so the two can never validate or alert differently.'
    }
  ],
  extensibility: [
    {
      area: 'New Movement Types',
      description: 'Add a new value to StockMovementType enum (e.g., DAMAGED, RETURN). The arithmetic and crossing-detection logic already live in one shared method.',
      difficulty: 'Easy'
    },
    {
      area: 'New Reorder Policy',
      description: 'Implement ReorderStrategy, add one @Component, add one line to ReorderStrategyFactory’s constructor. No existing code changes.',
      difficulty: 'Easy'
    },
    {
      area: 'New Alert Sink',
      description: 'Implement StockAlertObserver (e.g. an email or Slack notifier) and register the bean — StockAlertNotifier picks it up automatically via constructor injection.',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Implement a JPA-backed InventoryRepository. Swap via Spring @Profile. Service unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Multi-Warehouse',
      description: 'Add a Warehouse entity with a location field. StockMovement already carries fromLocation/toLocation for TRANSFER.',
      difficulty: 'Hard'
    }
  ],
  solid: [
    {
      principle: 'S — Single Responsibility',
      description: 'Product owns product data, ReorderStrategy owns reorder-quantity math, StockAlertNotifier owns fan-out, InventoryRepository owns persistence, InventoryService owns orchestration.'
    },
    {
      principle: 'O — Open/Closed',
      description: 'New reorder policies and new alert sinks are added by implementing an interface and registering a bean — no existing class is modified.'
    },
    {
      principle: 'L — Liskov Substitution',
      description: 'Any ReorderStrategy or StockAlertObserver implementation is interchangeable wherever the interface is used.'
    },
    {
      principle: 'I — Interface Segregation',
      description: 'StockAlertObserver exposes exactly one method (onStockAlert); ReorderStrategy exposes exactly reorderQuantity() and name().'
    },
    {
      principle: 'D — Dependency Inversion',
      description: 'InventoryService depends on the ReorderStrategy and StockAlertObserver interfaces, never a concrete implementation; Spring wires the rest.'
    }
  ],
  oop: [
    { name: 'Encapsulation', description: 'Product hides stock mutation behind InventoryService; external code cannot bypass the lock or the validation.' },
    { name: 'Inheritance', description: 'Every concrete exception extends InventoryException, an abstract base of com.lld.config.DomainException.' },
    { name: 'Polymorphism', description: 'InventoryService calls strategy.reorderQuantity(product) and observer.onStockAlert(alert) without knowing which concrete implementation runs.' },
    { name: 'Abstraction', description: 'ReorderStrategy and StockAlertObserver both hide their concrete algorithm behind a one-method interface.' }
  ]
};

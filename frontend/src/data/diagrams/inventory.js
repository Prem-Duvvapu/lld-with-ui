// classDiagrams — inventory
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Inventory Management System — Class Diagram',
  classes: [
    {
      name: 'InventoryController',
      stereotype: 'controller',
      fields: [
        '- inventoryService: InventoryService'
      ],
      methods: [
        '+ addProduct(product): Product',
        '+ getProducts(category?): List<Product>',
        '+ updateStock(productId, request): StockMovement',
        '+ reorder(productId, policy): StockMovement',
        '+ transferStock(productId, request): StockMovement',
        '+ getAlerts(): List<StockAlert>',
        '+ simRace(body): Map'
      ]
    },
    {
      name: 'InventoryService',
      stereotype: 'facade',
      fields: [
        '- repository, simRepository: InventoryRepository',
        '- notifier, simNotifier: StockAlertNotifier',
        '- reorderFactory: ReorderStrategyFactory',
        '- productLocks: ConcurrentHashMap<Long, ReentrantLock>'
      ],
      methods: [
        '+ addProduct(product): Product',
        '+ updateStock(productId, qty, type, reason): StockMovement',
        '+ reorder(productId, policy): StockMovement',
        '+ transferStock(productId, from, to, qty): StockMovement',
        '+ simRace(productId, buyers): Map',
        '- doUpdateStock(repo, notifier, feed, productId, qty, type, reason): StockMovement'
      ]
    },
    {
      name: 'StockAlertNotifier',
      stereotype: 'subject',
      fields: [
        '- observers: CopyOnWriteArrayList<StockAlertObserver>'
      ],
      methods: [
        '+ registerObserver(observer): void',
        '+ removeObserver(observer): void',
        '+ publish(alert): void'
      ]
    },
    {
      name: 'StockAlertObserver',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onStockAlert(alert): void'
      ]
    },
    {
      name: 'InAppStockAlertObserver',
      stereotype: 'observer',
      fields: ['- alerts: Deque<StockAlert>'],
      methods: ['+ onStockAlert(alert): void', '+ recentAlerts(): List<StockAlert>']
    },
    {
      name: 'LoggingStockAlertObserver',
      stereotype: 'observer',
      fields: [],
      methods: ['+ onStockAlert(alert): void']
    },
    {
      name: 'ReorderStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ name(): String',
        '+ reorderQuantity(product): int'
      ]
    },
    {
      name: 'MinRestockStrategy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ reorderQuantity(product): int']
    },
    {
      name: 'EoqReorderStrategy',
      stereotype: 'strategy',
      fields: ['- DEMAND_TURNS_PER_YEAR: int', '- ORDERING_COST: double', '- HOLDING_RATE: double'],
      methods: ['+ reorderQuantity(product): int']
    },
    {
      name: 'UrgentBufferReorderStrategy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ reorderQuantity(product): int']
    },
    {
      name: 'ReorderStrategyFactory',
      stereotype: 'factory',
      fields: ['- strategies: EnumMap<ReorderPolicy, ReorderStrategy>'],
      methods: ['+ forPolicy(policy): ReorderStrategy']
    },
    {
      name: 'InventoryRepository',
      stereotype: 'repository',
      fields: [
        '- products: ConcurrentHashMap<Long, Product>',
        '- suppliers: ConcurrentHashMap<Long, Supplier>',
        '- movements: ConcurrentHashMap<Long, List<StockMovement>>',
        '- events: Deque<InventoryEvent>'
      ],
      methods: [
        '+ saveProduct(product): Product',
        '+ findProductById(id): Product',
        '+ findAllProducts(): List<Product>',
        '+ addMovement(movement): void',
        '+ addEvent(event): void',
        '+ nextProductId/nextMovementId/nextEventId(): long'
      ]
    },
    {
      name: 'Product',
      stereotype: 'entity',
      fields: [
        '- id: long', '- sku: String', '- name: String', '- category: Category',
        '- unitPrice: double', '- currentStock: int', '- reorderLevel: int', '- supplierId: long'
      ],
      methods: ['+ isAtOrBelowReorderLevel(): boolean']
    },
    {
      name: 'StockAlert',
      stereotype: 'entity',
      fields: [
        '- type: AlertType', '- productId: long', '- sku: String',
        '- currentStock: int', '- quantityChanged: int', '- message: String'
      ],
      methods: []
    },
    {
      name: 'StockMovement',
      stereotype: 'entity',
      fields: [
        '- id: long', '- productId: long', '- type: StockMovementType',
        '- quantity: int', '- timestamp: LocalDateTime', '- reason: String', '- referenceId: String'
      ],
      methods: []
    },
    {
      name: 'InventoryEvent',
      stereotype: 'entity',
      fields: ['- type: EventType', '- message: String', '- timestamp: LocalDateTime'],
      methods: []
    },
    {
      name: 'Supplier',
      stereotype: 'entity',
      fields: ['- id: long', '- name: String', '- contactEmail: String', '- phone: String'],
      methods: []
    },
    {
      name: 'InventoryException',
      stereotype: 'exception',
      fields: [],
      methods: []
    },
    {
      name: 'ReorderPolicy',
      stereotype: 'enum',
      fields: ['MIN_RESTOCK', 'EOQ', 'URGENT_BUFFER'],
      methods: []
    },
    {
      name: 'Category',
      stereotype: 'enum',
      fields: ['ELECTRONICS', 'CLOTHING', 'FOOD', 'STATIONERY', 'MEDICINE', 'OTHER'],
      methods: []
    },
    {
      name: 'StockMovementType',
      stereotype: 'enum',
      fields: ['INBOUND', 'OUTBOUND', 'TRANSFER'],
      methods: []
    }
  ],
  relationships: [
    { from: 'InventoryController', to: 'InventoryService', label: 'delegates to' },
    { from: 'InventoryService', to: 'InventoryRepository', label: 'uses' },
    { from: 'InventoryService', to: 'StockAlertNotifier', label: 'publishes via' },
    { from: 'InventoryService', to: 'ReorderStrategyFactory', label: 'resolves via' },
    { from: 'InventoryService', to: 'InventoryException', label: 'throws', dashed: true },
    { from: 'StockAlertNotifier', to: 'StockAlertObserver', label: 'notifies' },
    { from: 'InAppStockAlertObserver', to: 'StockAlertObserver', label: 'implements', dashed: true },
    { from: 'LoggingStockAlertObserver', to: 'StockAlertObserver', label: 'implements', dashed: true },
    { from: 'ReorderStrategyFactory', to: 'ReorderStrategy', label: 'resolves' },
    { from: 'MinRestockStrategy', to: 'ReorderStrategy', label: 'implements', dashed: true },
    { from: 'EoqReorderStrategy', to: 'ReorderStrategy', label: 'implements', dashed: true },
    { from: 'UrgentBufferReorderStrategy', to: 'ReorderStrategy', label: 'implements', dashed: true },
    { from: 'ReorderStrategyFactory', to: 'ReorderPolicy', label: 'keyed by' },
    { from: 'InventoryRepository', to: 'Product', label: 'stores' },
    { from: 'InventoryRepository', to: 'Supplier', label: 'stores' },
    { from: 'InventoryRepository', to: 'StockMovement', label: 'appends' },
    { from: 'InventoryRepository', to: 'InventoryEvent', label: 'logs' },
    { from: 'Product', to: 'Category', label: 'categorised by' },
    { from: 'Product', to: 'Supplier', label: 'supplied by' },
    { from: 'StockMovement', to: 'StockMovementType', label: 'typed by' },
    { from: 'StockAlert', to: 'Product', label: 'concerns' },
    { from: 'MinRestockStrategy', to: 'InventoryException', label: 'throws', dashed: true }
  ]
};

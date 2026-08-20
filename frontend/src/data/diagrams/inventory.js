// classDiagrams — inventory
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Inventory Management System — Class Diagram',
  classes: [
    {
      name: 'InventoryController',
      stereotype: 'service',
      fields: [
        '- inventoryService: InventoryService'
      ],
      methods: [
        '+ addProduct(product): ResponseEntity<Product>',
        '+ getProducts(category?): ResponseEntity<List<Product>>',
        '+ updateStock(productId, request): ResponseEntity',
        '+ getLowStockItems(threshold=10): ResponseEntity<List<Product>>',
        '+ transferStock(productId, request): ResponseEntity',
        '+ getStockMovements(productId): ResponseEntity<List<StockMovement>>',
        '+ getSuppliers(): ResponseEntity<List<Supplier>>'
      ]
    },
    {
      name: 'InventoryService',
      stereotype: 'singleton',
      fields: [
        '- repository: InventoryRepository',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ addProduct(product): Product',
        '+ getProducts(category): List<Product>',
        '+ updateStock(productId, qty, type, reason): StockMovement',
        '+ getLowStockItems(threshold): List<Product>',
        '+ transferStock(productId, from, to, qty): StockMovement',
        '+ getStockMovements(productId): List<StockMovement>',
        '+ getSuppliers(): List<Supplier>'
      ]
    },
    {
      name: 'InventoryRepository',
      fields: [
        '- products: ConcurrentHashMap<Long, Product>',
        '- suppliers: ConcurrentHashMap<Long, Supplier>',
        '- movements: ConcurrentHashMap<Long, List<StockMovement>>',
        '- productIdGen: AtomicLong',
        '- movementIdGen: AtomicLong',
        '- supplierIdGen: AtomicLong',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ addProduct(product): void',
        '+ saveProduct(product): Product',
        '+ findProductById(id): Product',
        '+ findAllProducts(): List<Product>',
        '+ findProductsByCategory(category): List<Product>',
        '+ findSupplierById(id): Supplier',
        '+ findAllSuppliers(): List<Supplier>',
        '+ addMovement(movement): void',
        '+ findMovementsByProductId(productId): List<StockMovement>'
      ]
    },
    {
      name: 'Product',
      stereotype: 'entity',
      fields: [
        '- id: long',
        '- sku: String',
        '- name: String',
        '- category: Category',
        '- unitPrice: double',
        '- currentStock: int',
        '- reorderLevel: int',
        '- supplierId: long'
      ],
      methods: [
        '+ getCurrentStock(): int',
        '+ setCurrentStock(stock): void',
        '+ getReorderLevel(): int'
      ]
    },
    {
      name: 'StockMovement',
      stereotype: 'entity',
      fields: [
        '- id: long',
        '- productId: long',
        '- type: StockMovementType',
        '- quantity: int',
        '- timestamp: LocalDateTime',
        '- reason: String',
        '- referenceId: String'
      ],
      methods: [
        '+ getType(): StockMovementType',
        '+ getQuantity(): int'
      ]
    },
    {
      name: 'Supplier',
      stereotype: 'entity',
      fields: [
        '- id: long',
        '- name: String',
        '- contactEmail: String',
        '- phone: String'
      ],
      methods: []
    },
    {
      name: 'Category',
      stereotype: 'enum',
      fields: [
        'ELECTRONICS',
        'CLOTHING',
        'FOOD',
        'STATIONERY',
        'MEDICINE',
        'OTHER'
      ],
      methods: []
    },
    {
      name: 'StockMovementType',
      stereotype: 'enum',
      fields: [
        'INBOUND',
        'OUTBOUND',
        'TRANSFER'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'InventoryController', to: 'InventoryService', label: 'delegates to' },
    { from: 'InventoryService', to: 'InventoryRepository', label: 'uses' },
    { from: 'InventoryRepository', to: 'Product', label: 'stores' },
    { from: 'InventoryRepository', to: 'Supplier', label: 'stores' },
    { from: 'InventoryRepository', to: 'StockMovement', label: 'appends' },
    { from: 'Product', to: 'Category', label: 'categorised by' },
    { from: 'Product', to: 'Supplier', label: 'supplied by' },
    { from: 'StockMovement', to: 'Product', label: 'adjusts' },
    { from: 'StockMovement', to: 'StockMovementType', label: 'typed by' },
    { from: 'InventoryService', to: 'StockMovement', label: 'records' }
  ]
};

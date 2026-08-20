// designDetails — inventory
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Inventory Management — Design Details',
  requirements: [
    'Product catalog with SKU, category, pricing, stock levels, and reorder thresholds',
    'Stock movements tracking: INBOUND (restock), OUTBOUND (sale), TRANSFER (warehouse to warehouse)',
    'Low stock alerts — products below reorder level are flagged for restocking',
    'Color-coded stock status: green (sufficient), yellow (low), red (critical)',
    'Warehouse transfer support — move stock between locations with full traceability',
    'Thread-safe concurrent stock updates with ReentrantLock to prevent race conditions',
    'Supplier management — each product linked to a supplier for procurement tracking'
  ],
  entities: [
    {
      name: 'InventoryService',
      description: 'Core business logic layer. Handles product CRUD, stock movements (INBOUND/OUTBOUND/TRANSFER), low-stock queries, and supplier management. All stock-modifying operations are thread-safe.',
      fields: [
        {
          name: 'repository',
          type: 'InventoryRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic stock update operations'
        }
      ],
      methods: [
        {
          name: 'addProduct(product)',
          returns: 'Product',
          description: 'Creates a new product with auto-generated ID'
        },
        {
          name: 'getProducts(category)',
          returns: 'List<Product>',
          description: 'Lists all products, optionally filtered by category'
        },
        {
          name: 'updateStock(productId, qty, type, reason)',
          returns: 'StockMovement',
          description: 'INBOUND adds stock, OUTBOUND reduces; creates movement record'
        },
        {
          name: 'getLowStockItems(threshold)',
          returns: 'List<Product>',
          description: 'Products with currentStock <= threshold'
        },
        {
          name: 'transferStock(productId, from, to, qty)',
          returns: 'StockMovement',
          description: 'Moves stock between warehouse locations'
        },
        {
          name: 'getStockMovements(productId)',
          returns: 'List<StockMovement>',
          description: 'Full movement history for a product'
        }
      ]
    },
    {
      name: 'InventoryRepository',
      description: 'In-memory data store using ConcurrentHashMap and ReentrantLock. Seeds 8 products across 4 categories with varying stock levels and 3 suppliers.',
      fields: [
        {
          name: 'products',
          type: 'ConcurrentHashMap<Long, Product>',
          description: 'Product catalog indexed by ID'
        },
        {
          name: 'suppliers',
          type: 'ConcurrentHashMap<Long, Supplier>',
          description: 'Supplier directory indexed by ID'
        },
        {
          name: 'movements',
          type: 'ConcurrentHashMap<Long, List<StockMovement>>',
          description: 'Stock movements indexed by productId'
        },
        {
          name: 'productIdGen',
          type: 'AtomicLong',
          description: 'Auto-incrementing product ID generator'
        }
      ]
    },
    {
      name: 'StockMovement',
      description: 'Records every stock change with type, quantity, timestamp, reason, and reference ID for full audit trail.',
      fields: [
        {
          name: 'type',
          type: 'StockMovementType',
          value: 'INBOUND | OUTBOUND | TRANSFER',
          description: 'Direction of stock movement'
        },
        {
          name: 'productId',
          type: 'long',
          description: 'Product whose stock changed'
        },
        {
          name: 'quantity',
          type: 'int',
          description: 'Number of units moved (always positive)'
        },
        {
          name: 'referenceId',
          type: 'String',
          description: 'Business reference e.g. PO-001 or TRF-123'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      description: 'InventoryRepository abstracts data storage behind a clean interface. Service never touches ConcurrentHashMap directly.'
    },
    {
      name: 'Service Layer',
      description: 'InventoryService encapsulates all business logic with ReentrantLock for thread-safe stock operations.'
    },
    {
      name: 'Value Object',
      description: 'StockMovement is an immutable-like value object representing a domain event.'
    },
    {
      name: 'Strategy (implicit)',
      description: 'Stock update type (INBOUND vs OUTBOUND) acts as a strategy for how quantities affect currentStock.'
    }
  ],
  extensibility: [
    {
      area: 'New Movement Types',
      description: 'Add a new value to StockMovementType enum (e.g., DAMAGED, RETURN). Service logic for handling it goes in updateStock().',
      difficulty: 'Easy'
    },
    {
      area: 'Batch Operations',
      description: 'Add batchUpdateStock() that processes multiple products atomically using the existing ReentrantLock.',
      difficulty: 'Medium'
    },
    {
      area: 'Database Persistence',
      description: 'Implement InventoryJpaRepository. Swap via Spring @Profile. Service unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Analytics Dashboard',
      description: 'Add InventoryAnalyticsService that computes turnover rates, stock aging, and movement patterns from existing StockMovement records.',
      difficulty: 'Medium'
    },
    {
      area: 'Multi-Warehouse',
      description: 'Add Warehouse entity with location field. StockMovement gets fromLocation/toLocation. Transfer becomes cross-warehouse.',
      difficulty: 'Hard'
    }
  ],
  solid: [
    {
      principle: 'S — Single Responsibility',
      description: 'Product owns product data, StockMovement owns movement data, InventoryService owns business logic, InventoryRepository owns persistence.'
    },
    {
      principle: 'O — Open/Closed',
      description: 'New StockMovementType values can be added without changing existing code. New categories extend the enum safely.'
    },
    {
      principle: 'L — Liskov Substitution',
      description: 'All repository methods return interfaces (List). Any List implementation works without breaking callers.'
    },
    {
      principle: 'I — Interface Segregation',
      description: 'Service exposes fine-grained methods (addProduct, updateStock, transferStock) rather than one generic method.'
    },
    {
      principle: 'D — Dependency Inversion',
      description: 'Controller depends on InventoryService abstraction, not concrete implementation. Spring DI handles wiring.'
    }
  ],
  oop: [
    {
      name: 'Encapsulation',
      description: 'Product hides its stock mutation behind service methods. External code cannot modify stock directly.'
    },
    {
      name: 'Inheritance',
      description: 'All model classes extend Object. StockMovementType is an enum inheriting Enum behaviors.'
    },
    {
      name: 'Polymorphism',
      description: 'getProducts() works with or without category filter via overloaded repository methods.'
    },
    {
      name: 'Abstraction',
      description: 'StockMovement abstracts the concept of inventory change regardless of direction or reason.'
    }
  ]
};

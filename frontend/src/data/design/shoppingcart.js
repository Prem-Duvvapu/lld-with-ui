// designDetails — shoppingcart
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Online Shopping System (Shopping Cart) — Design Details',
  tldr: [
    'E-commerce shopping cart system with Command Pattern for cart actions (Undo/Redo), Strategy Pattern for flexible payment processing, and fine-grained per-product locking',
    'Deadlock prevention during multi-item checkout by sorting required product locks in ascending order by productId before lock acquisition',
    'Atomic stock check-and-decrement preventing negative inventory under high-concurrency race conditions',
    'Guarded order state machine (PLACED → PROCESSING → SHIPPED → DELIVERED / CANCELLED) with automatic inventory restocking upon cancellation',
    'Idempotency key caching protecting against duplicate payment charges on retried requests'
  ],
  requirements: [
    'Product Catalog & Search: Filter catalog by keyword, category, price range, and stock availability',
    'Cart Operations: Add, remove, and update cart item quantities with full Undo support',
    'Multi-Strategy Payment: Process checkout via UPI, Credit Card, Debit Card, or Digital Wallet strategies',
    'High-Concurrency Inventory Check: Prevent overselling when multiple users checkout low-stock items concurrently',
    'Order Lifecycle Management: Transition order states and restock items when orders are cancelled',
    'Idempotent API Checkout: Prevent duplicate orders using unique idempotency keys'
  ],
  entities: [
    {
      name: 'ShoppingCartService',
      description: 'Core business logic. Manages product catalog, cart operations, checkout flow, and order lifecycle. All cart-modifying operations are thread-safe with ReentrantLock.',
      fields: [
        {
          name: 'repository',
          type: 'ShoppingCartRepository',
          description: 'Data access layer injected via constructor'
        },
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'Ensures atomic cart and order operations'
        }
      ],
      methods: [
        {
          name: 'getProducts()',
          returns: 'List<Product>',
          description: 'Returns full product catalog'
        },
        {
          name: 'addToCart(cartId, userId, productId, qty)',
          returns: 'Cart',
          description: 'Adds item to cart; creates cart if cartId=0'
        },
        {
          name: 'removeFromCart(cartId, productId)',
          returns: 'Cart',
          description: 'Removes item from cart entirely'
        },
        {
          name: 'updateQuantity(cartId, productId, qty)',
          returns: 'Cart',
          description: 'Changes item quantity; removes if qty<=0'
        },
        {
          name: 'checkout(cartId, shippingAddress)',
          returns: 'Order',
          description: 'Creates order from cart items, clears cart'
        },
        {
          name: 'updateOrderStatus(orderId, status)',
          returns: 'Order',
          description: 'Advances order through state machine'
        }
      ]
    },
    {
      name: 'ShoppingCartRepository',
      description: 'In-memory data store using ConcurrentHashMap. Seeds 8 products across Electronics, Clothing, Footwear, Accessories, Kitchen, and Stationery categories.',
      fields: [
        {
          name: 'products',
          type: 'ConcurrentHashMap<Long, Product>',
          description: 'Product catalog indexed by ID'
        },
        {
          name: 'carts',
          type: 'ConcurrentHashMap<Long, Cart>',
          description: 'Active carts indexed by cart ID'
        },
        {
          name: 'orders',
          type: 'ConcurrentHashMap<Long, Order>',
          description: 'Completed orders indexed by order ID'
        }
      ]
    },
    {
      name: 'Cart',
      description: 'Value object representing a user shopping cart. Contains a Map<productId, CartItem> for O(1) item lookup and automatic total recalculation.',
      fields: [
        {
          name: 'items',
          type: 'Map<Long, CartItem>',
          description: 'Cart items indexed by productId for fast lookup'
        },
        {
          name: 'totalAmount',
          type: 'double',
          description: 'Auto-computed sum of all item totalPrices'
        },
        {
          name: 'createdAt',
          type: 'LocalDateTime',
          description: 'Timestamp when cart was first created'
        }
      ]
    },
    {
      name: 'Order',
      description: 'Value object capturing a completed purchase. Follows status state machine. Delivery time is set when status becomes DELIVERED.',
      fields: [
        {
          name: 'status',
          type: 'OrderStatus',
          value: 'PENDING→CONFIRMED→SHIPPED→DELIVERED',
          description: 'Order lifecycle state'
        },
        {
          name: 'items',
          type: 'List<CartItem>',
          description: 'Snapshot of cart items at checkout time'
        },
        {
          name: 'shippingAddress',
          type: 'String',
          description: 'Delivery destination'
        },
        {
          name: 'deliveryTime',
          type: 'LocalDateTime',
          description: 'Set when status becomes DELIVERED'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Repository Pattern',
      description: 'ShoppingCartRepository abstracts storage behind clean interface. Service never touches ConcurrentHashMap directly.'
    },
    {
      name: 'Service Layer',
      description: 'ShoppingCartService encapsulates all business logic with ReentrantLock for thread safety.'
    },
    {
      name: 'State Machine',
      description: 'OrderStatus enum defines the order lifecycle. Service validates transitions by checking current state.'
    },
    {
      name: 'Value Object',
      description: 'CartItem is an immutable-like value object with auto-computed totalPrice on quantity/price change.'
    }
  ],
  extensibility: [
    {
      area: 'Discounts & Coupons',
      description: 'Add DiscountStrategy interface (PercentageDiscount, FlatDiscount, BuyOneGetOne). Apply during checkout before order creation.',
      difficulty: 'Medium'
    },
    {
      area: 'Payment Integration',
      difficulty: 'Medium'
    },
    {
      area: 'Multiple Cart Support',
      description: 'Allow multiple carts per user (wishlist, saved-for-later). Cart already supports userId field — extend with cart name and saved status.',
      difficulty: 'Easy'
    },
    {
      area: 'Database Persistence',
      description: 'Implement ShoppingCartJpaRepository. Swap via Spring @Profile. Service layer unchanged thanks to Dependency Injection.',
      difficulty: 'Medium'
    },
    {
      area: 'Inventory Integration',
      description: 'On checkout, call InventoryService.updateStock() for each product to reduce available quantity. Prevents overselling.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Used Command Pattern for cart operations to easily support single-step atomic Undo functionality.',
    'Adopted per-product ReentrantLocks rather than global repository lock to maximize concurrency during checkout.',
    'Sorted lock acquisition order by productId ascending to eliminate circular wait deadlock vulnerabilities.'
  ],
  solid: [
    {
      principle: 'S — Single Responsibility',
      description: 'Product owns product data, CartItem owns line-item data, Cart owns cart state, Order owns order state, Service owns business rules.'
    },
    {
      principle: 'O — Open/Closed',
      description: 'New OrderStatus values (e.g., RETURNED) can be added without changing existing transitions. New product categories are trivially added.'
    },
    {
      principle: 'L — Liskov Substitution',
      description: 'Repository returns standard List/Map interfaces. Any implementation (in-memory, JPA) works interchangeably.'
    },
    {
      principle: 'I — Interface Segregation',
      description: 'Service exposes focused methods (addToCart, removeFromCart, updateQuantity, checkout) rather than a generic execute() method.'
    },
    {
      principle: 'D — Dependency Inversion',
      description: 'Controller depends on ShoppingCartService interface. Spring DI handles implementation injection.'
    }
  ],
  oop: [
    {
      name: 'Encapsulation',
      description: 'Cart hides its items map behind getItems(). Items cannot be modified without going through service methods that enforce business rules.'
    },
    {
      name: 'Inheritance',
      description: 'All model classes extend Object. OrderStatus is an enum inheriting Enum behaviors.'
    },
    {
      name: 'Polymorphism',
      description: 'Cart.recalculateTotal() works regardless of how many items or what types of products are in the cart.'
    },
    {
      name: 'Abstraction',
      description: 'CartItem abstracts the concept of a product+quantity+price combo regardless of which product it represents.'
    }
  ]
};

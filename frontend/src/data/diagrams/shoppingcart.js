// classDiagrams — shoppingcart
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Verified field-by-field and method-by-method against backend/src/main/java/com/lld/shoppingcart/**
// — every class, field and method below exists in the real code.

export default {
  title: 'Online Shopping System (Shopping Cart) — Class Diagram',
  classes: [
    {
      name: 'ShoppingCartService',
      stereotype: 'facade',
      fields: [
        '- products: Map<String, Product>',
        '- users: Map<String, User>',
        '- carts: Map<String, Cart>',
        '- orders: Map<String, Order>',
        '- userCommandHistory: Map<String, Stack<CartCommand>>',
        '- idempotencyCache: Map<String, Order>',
        '- paymentProcessor: ShoppingCartPaymentProcessor'
      ],
      methods: [
        '+ addToCart(userId, productId, quantity): void',
        '+ removeFromCart(userId, productId): void',
        '+ updateCartQuantity(userId, productId, quantity): void',
        '+ executeCommand(userId, command): void',
        '+ undoLastCartCommand(userId): boolean',
        '+ placeOrder(userId, method, idempotencyKey): Order',
        '+ cancelOrder(orderId): void',
        '+ updateOrderStatus(orderId, status): Order'
      ]
    },
    {
      name: 'Product',
      fields: [
        '- id: String',
        '- name: String',
        '- category: Category',
        '- price: double',
        '- stockQuantity: AtomicInteger',
        '- productLock: ReentrantLock (fair)'
      ],
      methods: [
        '+ getStockQuantity(): int',
        '+ decrementStock(qty): boolean',
        '+ incrementStock(qty): void',
        '+ getLock(): ReentrantLock'
      ]
    },
    {
      name: 'Cart',
      fields: [
        '- userId: String',
        '- items: Map<String, CartItem>'
      ],
      methods: [
        '+ addItem(product, qty): void',
        '+ removeItem(productId): void',
        '+ updateQuantity(productId, qty): void',
        '+ clear(): void',
        '+ getTotalAmount(): double'
      ]
    },
    {
      name: 'CartItem',
      fields: [
        '- productId: String',
        '- productName: String',
        '- unitPrice: double',
        '- quantity: int'
      ],
      methods: [
        '+ getTotalPrice(): double'
      ]
    },
    {
      name: 'Order',
      fields: [
        '- orderId: String',
        '- userId: String',
        '- items: List<OrderItem>',
        '- totalAmount: double',
        '- status: OrderStatus',
        '- paymentTransactionId: String',
        '- paymentMethod: PaymentMethod',
        '- createdAtEpoch: long'
      ],
      methods: [
        '+ setStatus(status): void',
        '+ setPaymentTransactionId(txId): void'
      ]
    },
    {
      name: 'OrderItem',
      fields: [
        '- productId: String',
        '- productName: String',
        '- unitPrice: double',
        '- quantity: int'
      ],
      methods: [
        '+ getTotalPrice(): double'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- address: String'
      ],
      methods: []
    },
    {
      name: 'CartCommand',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ execute(): void',
        '+ undo(): void'
      ]
    },
    {
      name: 'AddItemCommand',
      fields: [
        'implements CartCommand',
        '- cart: Cart',
        '- product: Product',
        '- quantity: int'
      ],
      methods: [
        '+ execute(): void',
        '+ undo(): void'
      ]
    },
    {
      name: 'RemoveItemCommand',
      fields: [
        'implements CartCommand',
        '- cart: Cart',
        '- removedItem: CartItem'
      ],
      methods: [
        '+ execute(): void',
        '+ undo(): void'
      ]
    },
    {
      name: 'UpdateQuantityCommand',
      fields: [
        'implements CartCommand',
        '- cart: Cart',
        '- productId: String',
        '- previousSnapshot: CartItem',
        '- newQuantity: int'
      ],
      methods: [
        '+ execute(): void',
        '+ undo(): void'
      ]
    },
    {
      name: 'ShoppingCartPaymentProcessor',
      stereotype: 'strategy-router',
      fields: [
        '- strategies: Map<PaymentMethod, PaymentStrategy>'
      ],
      methods: [
        '+ executePayment(orderId, amount, method): String'
      ]
    },
    {
      name: 'PaymentStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ processPayment(orderId, amount): String',
        '+ getMethod(): PaymentMethod'
      ]
    },
    {
      name: 'CreditCardPaymentStrategy',
      fields: ['implements PaymentStrategy'],
      methods: ['+ processPayment(orderId, amount): String', '+ getMethod(): PaymentMethod']
    },
    {
      name: 'DebitCardPaymentStrategy',
      fields: ['implements PaymentStrategy'],
      methods: ['+ processPayment(orderId, amount): String', '+ getMethod(): PaymentMethod']
    },
    {
      name: 'UpiPaymentStrategy',
      fields: ['implements PaymentStrategy'],
      methods: ['+ processPayment(orderId, amount): String', '+ getMethod(): PaymentMethod']
    },
    {
      name: 'WalletPaymentStrategy',
      fields: ['implements PaymentStrategy'],
      methods: ['+ processPayment(orderId, amount): String', '+ getMethod(): PaymentMethod']
    },
    {
      name: 'ShoppingCartException',
      stereotype: 'exception',
      fields: [
        'extends DomainException',
        'ProductNotFoundException (404)',
        'CartEmptyException (400)',
        'InsufficientStockException (409)',
        'InvalidOrderStateException (400)',
        'PaymentFailedException (422)'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'ShoppingCartService', to: 'Product', label: 'manages thread-safe catalog' },
    { from: 'ShoppingCartService', to: 'Cart', label: 'manages user carts' },
    { from: 'ShoppingCartService', to: 'User', label: 'registers' },
    { from: 'ShoppingCartService', to: 'Order', label: 'creates & tracks orders' },
    { from: 'ShoppingCartService', to: 'CartCommand', label: 'executes & undoes via per-user Stack' },
    { from: 'Cart', to: 'CartItem', label: 'contains' },
    { from: 'Order', to: 'OrderItem', label: 'contains immutable snapshot of' },
    { from: 'AddItemCommand', to: 'CartCommand', label: 'implements', dashed: true },
    { from: 'RemoveItemCommand', to: 'CartCommand', label: 'implements', dashed: true },
    { from: 'UpdateQuantityCommand', to: 'CartCommand', label: 'implements', dashed: true },
    { from: 'ShoppingCartService', to: 'ShoppingCartPaymentProcessor', label: 'delegates payment to' },
    { from: 'ShoppingCartPaymentProcessor', to: 'PaymentStrategy', label: 'resolves by PaymentMethod' },
    { from: 'CreditCardPaymentStrategy', to: 'PaymentStrategy', label: 'implements', dashed: true },
    { from: 'DebitCardPaymentStrategy', to: 'PaymentStrategy', label: 'implements', dashed: true },
    { from: 'UpiPaymentStrategy', to: 'PaymentStrategy', label: 'implements', dashed: true },
    { from: 'WalletPaymentStrategy', to: 'PaymentStrategy', label: 'implements', dashed: true },
    { from: 'ShoppingCartService', to: 'ShoppingCartException', label: 'throws', dashed: true },
    { from: 'ShoppingCartPaymentProcessor', to: 'ShoppingCartException', label: 'throws', dashed: true }
  ]
};

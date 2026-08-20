// classDiagrams — shoppingcart
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Online Shopping System (Shopping Cart) — Class Diagram',
  classes: [
    {
      name: 'ShoppingCartService',
      stereotype: 'singleton',
      fields: [
        '- products: Map<String, Product>',
        '- carts: Map<String, Cart>',
        '- orders: Map<String, Order>',
        '- userCommandHistory: Map<String, Stack<CartCommand>>'
      ],
      methods: [
        '+ addProduct(product): void',
        '+ addToCart(userId, productId, quantity): void',
        '+ undoLastCartCommand(userId): boolean',
        '+ placeOrder(userId, method, idempKey): Order',
        '+ cancelOrder(orderId): void'
      ]
    },
    {
      name: 'Product',
      fields: [
        '- id: String',
        '- name: String',
        '- price: double',
        '- stockQuantity: AtomicInteger',
        '- productLock: ReentrantLock'
      ],
      methods: [
        '+ decrementStock(qty): boolean',
        '+ incrementStock(qty): void'
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
        '+ getTotalAmount(): double'
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
        '- paymentMethod: PaymentMethod'
      ],
      methods: [
        '+ setStatus(status): void'
      ]
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
    }
  ],
  relationships: [
    {
      from: 'ShoppingCartService',
      to: 'Product',
      label: 'manages thread-safe catalog'
    },
    {
      from: 'ShoppingCartService',
      to: 'Cart',
      label: 'manages user carts'
    },
    {
      from: 'ShoppingCartService',
      to: 'Order',
      label: 'creates & tracks orders'
    },
    {
      from: 'ShoppingCartService',
      to: 'CartCommand',
      label: 'executes & undoes'
    },
    {
      from: 'AddItemCommand',
      to: 'CartCommand',
      label: 'implements',
      dashed: true
    },
    {
      from: 'RemoveItemCommand',
      to: 'CartCommand',
      label: 'implements',
      dashed: true
    },
    {
      from: 'ShoppingCartService',
      to: 'ShoppingCartPaymentProcessor',
      label: 'delegates payments to'
    }
  ]
};

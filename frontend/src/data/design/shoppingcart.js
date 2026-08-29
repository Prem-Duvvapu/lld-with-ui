// designDetails — shoppingcart
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten to match backend/src/main/java/com/lld/shoppingcart/** exactly (RCA: the previous
// version invented a ShoppingCartRepository, a cartId/checkout(cartId, shippingAddress) API, an
// OrderStatus PENDING->CONFIRMED->SHIPPED->DELIVERED chain and a Cart.recalculateTotal() method —
// none of which exist in the real code. State lives directly inside ShoppingCartService's own
// ConcurrentHashMaps; there is no separate repository class).

export default {
  title: 'Online Shopping System (Shopping Cart) — Design Details',
  tldr: [
    'E-commerce shopping cart with Command Pattern cart actions (add/remove/update quantity), single-step Undo via a per-user command-history Stack, and Strategy Pattern payment resolution across four payment methods',
    'Deadlock-free checkout: every product touched by an order is locked in ascending product-id order, never cart-insertion order, before stock is validated and decremented',
    'Lock-free CAS stock protection (AtomicInteger.compareAndSet) on top of the per-product lock, so stock can never go negative under concurrent checkout of the same product',
    'Idempotency-key cache so a retried placeOrder() call returns the identical cached Order instead of re-validating stock or charging payment a second time',
    'Guarded order lifecycle (PLACED -> PROCESSING -> SHIPPED -> DELIVERED, or CANCELLED before SHIPPED) with automatic inventory restocking on cancellation',
    'Isolated /sim/* sandbox — a second set of product/cart/order maps, reset on demand, so the interactive demo can never corrupt live carts or orders'
  ],
  requirements: [
    'Product Catalog & Search: filter by keyword, category and price range',
    'Cart Operations: add, remove and update cart item quantities, each undoable in a single step',
    'Multi-Strategy Payment: checkout via UPI, Credit Card, Debit Card or Wallet',
    'High-Concurrency Inventory Safety: two carts sharing products in opposite insertion order must never deadlock each other during checkout, and stock must never oversell',
    'Idempotent Checkout: a network-retried checkout with the same idempotency key must not double-charge or double-decrement stock',
    'Order Lifecycle Management: guarded state transitions, with automatic restock on cancellation before a shipment'
  ],
  entities: [
    {
      name: 'ShoppingCartService',
      description: 'The facade every controller endpoint delegates to. Owns five ConcurrentHashMaps (products, users, carts, orders, idempotencyCache) plus a per-user Stack<CartCommand> command history for undo, and a completely separate set of maps for the isolated /sim/* sandbox.',
      fields: [
        { name: 'products / users / carts / orders', type: 'ConcurrentHashMap<String, ...>', description: 'Live in-memory state — no repository class; the service owns the maps directly' },
        { name: 'userCommandHistory', type: 'ConcurrentHashMap<String, Stack<CartCommand>>', description: 'One undo stack per user, pushed to by executeCommand(), popped by undoLastCartCommand()' },
        { name: 'idempotencyCache', type: 'ConcurrentHashMap<String, Order>', description: 'idempotencyKey -> Order, checked at the very top of placeOrder() before any locking' },
        { name: 'simProducts / simCarts / simOrders / simEventLog', type: 'ConcurrentHashMap / List<SimEvent>', description: 'A second, independent set of state for the isolated /sim/* engine — reset by initSimState()' }
      ],
      methods: [
        { name: 'addToCart(userId, productId, qty)', returns: 'void', description: 'Builds an AddItemCommand and routes it through executeCommand()' },
        { name: 'removeFromCart(userId, productId)', returns: 'void', description: 'Builds a RemoveItemCommand capturing the current CartItem, then executes it' },
        { name: 'updateCartQuantity(userId, productId, qty)', returns: 'void', description: 'Snapshots the current CartItem (not just its quantity) so UpdateQuantityCommand can undo correctly even if the update drops quantity to 0' },
        { name: 'undoLastCartCommand(userId)', returns: 'boolean', description: 'Pops the user\'s command-history Stack and calls undo() on it' },
        { name: 'placeOrder(userId, method, idempotencyKey)', returns: 'Order', description: 'Checks the idempotency cache; sorts every cart product by id ascending; locks them in that order; validates then decrements stock; resolves payment via ShoppingCartPaymentProcessor; caches and returns the Order; unlocks in reverse order in a finally block' },
        { name: 'cancelOrder(orderId)', returns: 'void', description: 'Throws InvalidOrderStateException for SHIPPED/DELIVERED/CANCELLED orders; otherwise restocks every OrderItem and sets status CANCELLED' }
      ]
    },
    {
      name: 'Product',
      description: 'A catalog product. Stock is an AtomicInteger for a lock-free CAS decrement fast path, additionally covered end-to-end by a fair per-product ReentrantLock during checkout. Lombok @Getter only (not @Data/@Builder) — the same lock-field precedent as com.lld.atm.model.Account — because a mutable ReentrantLock must never end up in equals/hashCode/toString, and the raw AtomicInteger must never leak into JSON as-is.',
      fields: [
        { name: 'stockQuantity', type: 'AtomicInteger', description: 'CAS-updated by decrementStock()/incrementStock(); getStockQuantity() returns the plain int' },
        { name: 'productLock', type: 'ReentrantLock (fair)', description: '@Getter(AccessLevel.NONE) + @JsonIgnore on the hand-written getLock() — never serialized, never in generated equals/hashCode' }
      ]
    },
    {
      name: 'Cart',
      description: 'A user\'s live cart. Lombok @Getter only: items must never get a generated setter (all mutation goes through addItem/removeItem/updateQuantity so CartCommand stays the single mutation path), and the single-arg constructor doubles as the Cart::new method reference passed to Map#computeIfAbsent in getCart().',
      fields: [
        { name: 'items', type: 'Map<String, CartItem>', description: 'ConcurrentHashMap keyed by productId' }
      ]
    },
    {
      name: 'CartCommand',
      description: 'execute()/undo() interface with three implementations: AddItemCommand, RemoveItemCommand, UpdateQuantityCommand. ShoppingCartService#executeCommand() pushes every executed command onto the user\'s Stack; undoLastCartCommand() pops and calls undo().',
      fields: [
        { name: 'AddItemCommand', type: 'CartCommand', description: 'undo() recomputes the pre-command quantity as (current - addedQty), removing the line item entirely if that reaches 0' },
        { name: 'RemoveItemCommand', type: 'CartCommand', description: 'Captures the removed CartItem at construction; undo() reinserts that exact object' },
        { name: 'UpdateQuantityCommand', type: 'CartCommand', description: 'Snapshots the full previous CartItem (not just its quantity) so undo() can fully reconstruct the line item even when the update dropped quantity to 0 and Cart#updateQuantity removed the entry (which it cannot resurrect from a bare productId+quantity)' }
      ]
    },
    {
      name: 'Order',
      description: 'An immutable line-item snapshot (List<OrderItem>) plus mutable lifecycle state. @Data + @Builder with @Builder.Default mirroring the constructor\'s own defaults (status starts PLACED, createdAtEpoch stamped at construction) — the hand-written constructor stays because those defaults can\'t be expressed by a plain all-args constructor.',
      fields: [
        { name: 'status', type: 'OrderStatus', description: 'PLACED, PROCESSING, SHIPPED, DELIVERED, CANCELLED — cancelOrder() rejects SHIPPED/DELIVERED/already-CANCELLED' },
        { name: 'items', type: 'List<OrderItem>', description: 'Immutable snapshot of price/name at checkout time, independent of later catalog changes' }
      ]
    },
    {
      name: 'ShoppingCartPaymentProcessor',
      description: 'Strategy-pattern router. Built from every Spring-managed PaymentStrategy bean into a Map<PaymentMethod, PaymentStrategy>; executePayment() throws PaymentFailedException (422) when no strategy is registered for the requested method — a real, reachable branch (proven by ShoppingCartPaymentProcessorTest constructing a processor with a partial strategy list), not dead code.',
      fields: [
        { name: 'strategies', type: 'Map<PaymentMethod, PaymentStrategy>', description: 'Populated in the constructor from an injected List<PaymentStrategy>' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Command Pattern',
      description: 'AddItemCommand / RemoveItemCommand / UpdateQuantityCommand implement CartCommand (execute/undo). ShoppingCartService pushes each executed command onto a per-user Stack so undoLastCartCommand() can pop and reverse the most recent action in one call.'
    },
    {
      name: 'Strategy Pattern',
      description: 'PaymentStrategy interface with CreditCardPaymentStrategy, DebitCardPaymentStrategy, UpiPaymentStrategy and WalletPaymentStrategy, resolved by PaymentMethod through ShoppingCartPaymentProcessor — the processor never branches on payment type itself.'
    },
    {
      name: 'Ascending-ID Lock Ordering',
      description: 'placeOrder() sorts every product touched by the order by Product#id ascending and locks them in that order — never cart-insertion order — the same idiom com.lld.digitalwallet.command.TransferCommand uses for two-account transfers, generalized to N products. This makes a circular wait (and therefore deadlock) impossible across concurrent orders that share products.'
    },
    {
      name: 'Idempotency Cache',
      description: 'A client-supplied idempotencyKey is checked before any locking; a cache hit returns the identical previously-created Order with no re-validation, no second stock decrement and no second payment call — proven under concurrent retries in ShoppingCartConcurrencyTest, not just sequential ones.'
    },
    {
      name: 'Lock-Free CAS + Coarse Lock Defense in Depth',
      description: 'Product#decrementStock uses AtomicInteger#compareAndSet in a retry loop as the actual stock-safety mechanism, while the surrounding per-product ReentrantLock in placeOrder() additionally serializes the whole validate-then-decrement-then-pay sequence per product so a stock check can never be invalidated by another thread between the check and the decrement.'
    }
  ],
  extensibility: [
    {
      area: 'Discounts & Coupons',
      description: 'Add a DiscountStrategy interface applied to Cart#getTotalAmount() before checkout — no existing class needs to change.',
      difficulty: 'Medium'
    },
    {
      area: 'A fifth PaymentMethod',
      description: 'Add the enum constant and a new @Component PaymentStrategy bean; ShoppingCartPaymentProcessor picks it up automatically via its injected List<PaymentStrategy>. Forgetting the bean is exactly the PaymentFailedException("Unsupported payment method") path.',
      difficulty: 'Easy'
    },
    {
      area: 'A RedoCommand stack',
      description: 'CartCommand already models undo(); a second per-user Stack<CartCommand> of undone commands, pushed to on undo and popped on redo, would add Redo without changing the three existing command classes.',
      difficulty: 'Easy'
    },
    {
      area: 'Persisting orders',
      description: 'Extract a ShoppingCartRepository behind the current ConcurrentHashMaps and swap the implementation via Spring @Profile — ShoppingCartService\'s method bodies would be largely unaffected since it already treats them as an opaque store.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Command Pattern for cart operations, at the cost of one Stack<CartCommand> per user held in memory for the life of the session, to get single-step atomic Undo without duplicating mutation logic.',
    'Per-product fair ReentrantLocks rather than one repository-wide lock, so two checkouts touching disjoint products never block each other — at the cost of every multi-product checkout needing an explicit lock-ordering rule (ascending product id) to stay deadlock-free.',
    'AtomicInteger CAS as the authoritative stock guard, with the surrounding ReentrantLock mainly serializing the check-then-decrement-then-charge sequence rather than protecting the counter itself, which is redundant under the single-writer-per-lock discipline but cheap insurance if that discipline is ever violated.',
    'The idempotency cache is an unbounded ConcurrentHashMap with no TTL/eviction — correct for a demo/portfolio scope, but a production system would need to expire keys.'
  ],
  solid: [
    { principle: 'S — Single Responsibility', description: 'Product owns stock/pricing, Cart owns line-item state, Order owns an immutable purchase snapshot, each CartCommand owns one reversible mutation, ShoppingCartPaymentProcessor owns strategy resolution only.' },
    { principle: 'O — Open/Closed', description: 'A new CartCommand or a new PaymentStrategy can be added without touching ShoppingCartService\'s checkout logic or the other commands/strategies.' },
    { principle: 'L — Liskov Substitution', description: 'Any PaymentStrategy is interchangeable behind ShoppingCartPaymentProcessor#executePayment(); any CartCommand is interchangeable behind execute()/undo().' },
    { principle: 'I — Interface Segregation', description: 'CartCommand exposes exactly execute()/undo(); PaymentStrategy exposes exactly processPayment()/getMethod() — neither forces an implementer to support operations it doesn\'t need.' },
    { principle: 'D — Dependency Inversion', description: 'ShoppingCartService depends on the PaymentStrategy interface (via ShoppingCartPaymentProcessor) and the CartCommand interface, never on a concrete strategy or command class.' }
  ],
  oop: [
    { name: 'Encapsulation', description: 'Cart exposes items only via getItems() with no generated setter; all mutation is forced through addItem/removeItem/updateQuantity. Product exposes stock only via getStockQuantity()/decrementStock()/incrementStock(), never the raw AtomicInteger.' },
    { name: 'Polymorphism', description: 'ShoppingCartService#executeCommand(userId, CartCommand) and ShoppingCartPaymentProcessor#executePayment(...) both dispatch through an interface without knowing the concrete implementation.' },
    { name: 'Abstraction', description: 'CartCommand abstracts "a reversible cart mutation" regardless of what it does; PaymentStrategy abstracts "charge this amount" regardless of payment rail.' },
    { name: 'Composition', description: 'ShoppingCartService is composed of a ShoppingCartPaymentProcessor (constructor-injected) rather than implementing payment logic itself.' }
  ]
};

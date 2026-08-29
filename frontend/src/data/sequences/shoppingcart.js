// Sequence diagram content for shoppingcart.
// Grounded directly in ShoppingCartService#placeOrder, ShoppingCartPaymentProcessor and
// PaymentStrategy — corrected after an earlier version invented a DiscountStrategy/
// DiscountStrategyFactory pattern that doesn't exist in this module's actual code (see the
// sequences bulk-add incident noted in HANDOFF.md). The real patterns are Command (AddItemCommand/
// RemoveItemCommand/UpdateQuantityCommand, with undo via a per-user command-history Stack) and
// Strategy (PaymentStrategy resolved by payment method) — neither of which the earlier diagram
// mentioned at all.
export default {
  title: 'Shopping Cart — Ascending-Lock Checkout, Idempotent Retry & Strategy-Resolved Payment',
  description:
    'How placeOrder() avoids deadlock when a cart has multiple products: every product touched by the order is locked in ascending product-ID order (the same idiom digitalwallet uses for two-account transfers), never in cart-insertion order — so two carts that share products in opposite orders can never deadlock each other. Payment itself is resolved by PaymentMethod through ShoppingCartPaymentProcessor to one of several PaymentStrategy implementations, and a client-supplied idempotencyKey makes a retried placeOrder() call return the SAME order instead of double-charging.',
  flows: [
    {
      id: 'ascending-lock-checkout-with-idempotent-retry',
      label: 'Checkout locks products in ascending ID order, then a network-retry hits the idempotency cache',
      description:
        'User "u1" has two items in cart: product "P9" (added first) and product "P3" (added second) — cart-insertion order is P9 then P3, but placeOrder() sorts by product id before locking, so it locks P3 first. Stock is validated and decremented under both locks, payment is resolved to the strategy matching the requested method, and the order is cached under the client\'s idempotency key. The client\'s HTTP call then times out and retries with the SAME key — placeOrder() returns the cached order immediately instead of re-validating stock or charging a second time.',
      participants: [
        { id: 'user', name: 'User\n(u1)', kind: 'actor' },
        { id: 'controller', name: 'ShoppingCartController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ShoppingCartService', kind: 'component', stereotype: 'facade' },
        { id: 'lockP3', name: 'P3.getLock()', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'lockP9', name: 'P9.getLock()', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'processor', name: 'ShoppingCartPayment\nProcessor', kind: 'component', stereotype: 'facade' },
        { id: 'strategy', name: 'PaymentStrategy\n(resolved by method)', kind: 'component', stereotype: 'strategy' },
      ],
      steps: [
        { type: 'note', over: ['user'], text: 'Cart holds P9 (added first) then P3 (added second) — insertion order is P9, P3.' },
        { from: 'user', to: 'controller', text: 'POST /api/shoppingcart/checkout {userId: "u1", method: "CREDIT_CARD", idempotencyKey: "req-77"}' },
        { from: 'controller', to: 'service', text: 'placeOrder("u1", CREDIT_CARD, "req-77")', activate: 'service' },
        { from: 'service', to: 'service', text: 'idempotencyCache.get("req-77") -> null (first attempt)' },
        { from: 'service', to: 'service', text: 'sort cart items by Product#id ascending -> lock order is [P3, P9], NOT insertion order [P9, P3]' },
        { from: 'service', to: 'lockP3', text: 'P3.getLock().lock() — ACQUIRED (locked first, despite being added second)', activate: 'lockP3' },
        { from: 'service', to: 'lockP9', text: 'P9.getLock().lock() — ACQUIRED', activate: 'lockP9' },
        { type: 'note', over: ['lockP3', 'lockP9'], text: 'Every concurrent placeOrder() call that touches P3 and P9 together acquires them in this SAME ascending order — the precondition for a wait-cycle (deadlock) can never form, regardless of each cart\'s own insertion order.' },
        { from: 'service', to: 'service', text: 'validate stock for P3 and P9 — both sufficient' },
        { from: 'service', to: 'service', text: 'P3.decrementStock(qty) ; P9.decrementStock(qty)' },
        { from: 'service', to: 'processor', text: 'executePayment("ORD-501", totalAmount, CREDIT_CARD)', activate: 'processor' },
        { from: 'processor', to: 'strategy', text: 'strategies.get(CREDIT_CARD).processPayment("ORD-501", totalAmount)', activate: 'strategy' },
        { from: 'strategy', to: 'processor', text: 'return "TXN-CC-9001"', type: 'return', deactivate: 'strategy' },
        { from: 'processor', to: 'service', text: 'return "TXN-CC-9001"', type: 'return', deactivate: 'processor' },
        { from: 'service', to: 'service', text: 'orders.put("ORD-501", Order{...}) ; cart.clear() ; idempotencyCache.put("req-77", order)' },
        { from: 'service', to: 'lockP9', text: 'P9.getLock().unlock()  — released in REVERSE order', deactivate: 'lockP9' },
        { from: 'service', to: 'lockP3', text: 'P3.getLock().unlock()', deactivate: 'lockP3' },
        { from: 'service', to: 'controller', text: 'return Order ORD-501', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'user', text: '200 OK — Order ORD-501 confirmed', type: 'return' },
        { type: 'note', over: ['user'], text: 'The response is lost on the wire — the client never sees it and assumes the request failed.' },
        { from: 'user', to: 'controller', text: 'POST /api/shoppingcart/checkout {userId: "u1", method: "CREDIT_CARD", idempotencyKey: "req-77"}  — RETRY, same key' },
        { from: 'controller', to: 'service', text: 'placeOrder("u1", CREDIT_CARD, "req-77")', activate: 'service' },
        { from: 'service', to: 'service', text: 'idempotencyCache.get("req-77") -> Order ORD-501  (cache HIT)' },
        { from: 'service', to: 'controller', text: 'return the SAME Order ORD-501 — no re-validation, no second decrement, no second charge', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'user', text: '200 OK — Order ORD-501 (identical response)', type: 'return' },
      ],
    },
  ],
};

// Sequence diagram content for shoppingcart (Amazon / E-Commerce Cart).
// Grounded directly in ShoppingCartService, DiscountStrategyFactory,
// and Inventory Reservation during checkout.
export default {
  title: 'Shopping Cart — Discount Strategy Dispatch & Atomic Checkout',
  description:
    'How ShoppingCartService applies coupon discounts and processes orders. DiscountStrategyFactory resolves percentage, flat, or buy-one-get-one rules dynamically without if/else branching, followed by stock verification and cart clearing.',
  flows: [
    {
      id: 'coupon-and-checkout-flow',
      label: 'Apply coupon discount via Strategy Factory → Finalize checkout',
      description:
        'Customer applies promo code "SUMMER20" (PercentageDiscountStrategy: 20% off). ShoppingCartService validates minimum cart amount, recalculates line items and totals via DiscountStrategyFactory, reserves inventory, and completes the purchase.',
      participants: [
        { id: 'shopper', name: 'Shopper\n(Client)', kind: 'actor' },
        { id: 'controller', name: 'ShoppingCart\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'ShoppingCart\nService', kind: 'component', stereotype: 'facade' },
        { id: 'discountFactory', name: 'DiscountStrategy\nFactory', kind: 'component', stereotype: 'factory' },
        { id: 'discountStrategy', name: 'PercentageDiscount\nStrategy', kind: 'component', stereotype: 'strategy' },
        { id: 'repo', name: 'CartRepository', kind: 'store' },
        { id: 'inventory', name: 'InventoryService', kind: 'component' },
      ],
      steps: [
        { from: 'shopper', to: 'controller', text: 'POST /api/shoppingcart/cart/coupon {code: "SUMMER20", cartId: "CART-01"}' },
        { from: 'controller', to: 'service', text: 'applyCoupon("CART-01", "SUMMER20")', activate: 'service' },
        { from: 'service', to: 'repo', text: 'getCart("CART-01") → Cart {subtotal: ₹2000.0, items: 3}' },
        { from: 'service', to: 'discountFactory', text: 'getStrategy("PERCENTAGE")', activate: 'discountFactory' },
        { from: 'discountFactory', to: 'service', text: 'return PercentageDiscountStrategy', type: 'return', deactivate: 'discountFactory' },
        { from: 'service', to: 'discountStrategy', text: 'applyDiscount(cart, rate=0.20)', activate: 'discountStrategy' },
        { from: 'discountStrategy', to: 'service', text: 'DiscountResult {discount: ₹400.0, finalTotal: ₹1600.0}', type: 'return', deactivate: 'discountStrategy' },
        { from: 'service', to: 'repo', text: 'updateCart("CART-01", coupon="SUMMER20", discount=400.0, total=1600.0)' },
        { from: 'service', to: 'controller', text: 'return updated Cart', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'shopper', text: '200 OK — 20% discount applied (Savings: ₹400.00)', type: 'return' },
        { from: 'shopper', to: 'controller', text: 'POST /api/shoppingcart/checkout {cartId: "CART-01", payment: "CARD"}' },
        { from: 'controller', to: 'service', text: 'checkout("CART-01", "CARD")', activate: 'service' },
        { from: 'service', to: 'inventory', text: 'reserveAndDeductItems(cart.items)' },
        { from: 'inventory', to: 'service', text: 'Stock reserved ✓', type: 'return' },
        { from: 'service', to: 'repo', text: 'createOrder("ORD-SHOP-99") ; clearCart("CART-01")' },
        { from: 'service', to: 'controller', text: 'return Order ORD-SHOP-99 (CONFIRMED)', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'shopper', text: '200 OK — Order placed successfully! Cart cleared.', type: 'return' },
      ],
    },
  ],
};

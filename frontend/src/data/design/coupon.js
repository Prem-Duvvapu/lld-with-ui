// designDetails — coupon
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Coupon / Promotion Engine — Design Details',
  requirements: [
    'Apply a coupon to a cart total — percentage-off, flat-off, and buy-one-get-one (BOGO) — with a hard per-coupon redemption limit that must never be exceeded, even under concurrent checkout.',
    'Strategy Pattern for discount calculation: DiscountStrategy (PercentageOff/FlatOff/Bogo), resolved by DiscountStrategyFactory via a Map.',
    'Chain of Responsibility for eligibility, not another Composite tree: this repo already ships a Composite Condition tree in featureflag, so a differently-shaped pattern here (min cart value -> category restriction -> first-order-only, each independently able to reject with a specific reason) keeps the portfolio varied.',
    'Race-Free Redemption Limit: a coupon with maxRedemptions=100 must never be redeemed 101 times under concurrent checkout — the classic bounded-counter check-then-act race.',
    'Isolated Concurrency Simulation: an isolated /api/coupon/sim/* sandbox (a second CouponRepository instance) with a live 8-worker redemption race against a coupon with only 3 redemptions left, so the demo can never touch live coupon state.',
  ],
  entities: [
    {
      name: 'CouponService',
      description: 'Spring @Service facade owning coupon creation, application, and the isolated simulation engine.',
      fields: [
        { name: 'repository', type: 'CouponRepository', description: 'Live coupon ledger' },
        { name: 'chainFactory', type: 'EligibilityChainFactory', description: 'Wires and runs the eligibility chain' },
        { name: 'strategyFactory', type: 'DiscountStrategyFactory', description: 'Resolves DiscountType to a concrete strategy' },
      ],
      methods: [
        { name: 'apply(code, cart)', returns: 'ApplyResult', description: 'Expiry check, then eligibility chain, then the redemption-limit lock, then the discount calculation' },
      ],
    },
    {
      name: 'Coupon',
      description: 'A single coupon. currentRedemptions is mutated only through tryRedeem(), the one place its budget can move — the same "single enforcement point" idiom as locker.model.Locker#transitionTo.',
      fields: [
        { name: 'maxRedemptions', type: 'int', description: 'The hard budget' },
        { name: 'currentRedemptions', type: 'int', description: 'Mutated only inside tryRedeem(), which callers must invoke under getLock()' },
        { name: 'couponLock', type: 'ReentrantLock', description: 'Fair, per-coupon lock — held across the whole "read count, compare to limit, increment" sequence' },
      ],
      methods: [
        { name: 'tryRedeem()', returns: 'boolean', description: 'Atomic (under the caller-held lock) check-and-increment; false means the budget is exhausted' },
      ],
    },
    {
      name: 'EligibilityHandler (Chain of Responsibility, abstract)',
      description: 'Each concrete handler decides independently whether to reject; the base class owns delegating to the next handler when this one passes.',
      fields: [],
      methods: [
        { name: 'check(coupon, cart)', returns: 'Optional<String>', description: 'Template method: evaluate(), then delegate to the next handler if this one passed' },
        { name: 'evaluate(coupon, cart)', returns: 'Optional<String>', description: 'Abstract — empty means pass, present is the rejection reason' },
      ],
    },
    {
      name: 'MinCartValueHandler / CategoryRestrictionHandler / FirstOrderOnlyHandler',
      description: 'The three concrete links, wired in that fixed order by EligibilityChainFactory.',
      fields: [],
      methods: [
        { name: 'evaluate(coupon, cart)', returns: 'Optional<String>', description: 'MinCartValue: cart total below the coupon\'s minimum. CategoryRestriction: cart category doesn\'t match. FirstOrderOnly: not the customer\'s first order.' },
      ],
    },
    {
      name: 'BogoStrategy',
      description: 'The one strategy that genuinely depends on more than discountValue — every 2nd item in the cart is free, computed from itemCount and the average per-item price.',
      fields: [],
      methods: [
        { name: 'apply(cart, discountValue)', returns: 'double', description: 'freeItems = itemCount / 2; discount = freeItems * (cartTotal / itemCount); with fewer than 2 items, no discount applies at all' },
      ],
    },
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory-shaped Resolver',
      used: true,
      explanation: 'DiscountStrategyFactory resolves DiscountType (PERCENTAGE_OFF/FLAT_OFF/BOGO) to a DiscountStrategy via a Map built once from every injected strategy bean — the same shape as locker.strategy.LockerAllocationStrategyFactory.',
    },
    {
      name: 'Chain of Responsibility',
      used: true,
      explanation: 'MinCartValueHandler -> CategoryRestrictionHandler -> FirstOrderOnlyHandler, wired by EligibilityChainFactory with the same setNext-linking shape as logging.chain.LogHandler and payment.fraud.FraudCheckHandler. Chosen deliberately over another Composite condition tree (featureflag already ships one) to keep the portfolio\'s pattern usage varied rather than repetitive.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'CouponRepository is pure CRUD; eligibility decisions live in the chain handlers; discount math lives in the strategies; CouponService only orchestrates.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A fourth eligibility rule (e.g. a max-uses-per-customer handler) is one new handler class and one line in EligibilityChainFactory\'s constructor — no existing handler changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every EligibilityHandler honors the same evaluate() contract; EligibilityChainFactory never needs to know which concrete handler it is talking to. Every DiscountStrategy honors the same apply(cart, discountValue) contract regardless of how differently BOGO computes its result.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'A Coupon\'s ReentrantLock and currentRedemptions field are private; every mutation goes through tryRedeem().' },
    { name: 'Polymorphism', description: 'CouponService calls chainFactory.run(...) and strategyFactory.forType(...).apply(...) without knowing which concrete handlers or strategy are involved.' },
    { name: 'Template Method', description: 'EligibilityHandler#check is a template method: it always calls evaluate() then conditionally delegates to the next handler, with only evaluate() varying per subclass.' },
  ],
  extensibility: [
    { area: 'Coupon stacking', description: 'Today only one coupon can be applied per call; stacking multiple coupons on one cart would need an explicit precedence/ordering rule (e.g. percentage discounts before flat discounts) and a decision about whether BOGO can combine with a percentage-off at all.', difficulty: 'Medium' },
    { area: 'Per-customer redemption limits', description: 'maxRedemptions is a single global budget today; a "once per customer" rule would need Coupon to track a Set of customer ids redeemed against, not just a count — a genuinely different data shape, not just a lower number.', difficulty: 'Medium' },
    { area: 'Scheduled/timed promotions', description: 'A coupon that only activates during a specific window (e.g. a flash sale) would need an activatesAtEpoch alongside the existing expiresAtEpoch, checked the same way isExpired() is checked today.', difficulty: 'Easy' },
  ],
  tradeoffs: [
    'The eligibility chain runs entirely unlocked, outside the coupon\'s own lock — it only reads the coupon\'s immutable config fields (minCartValue, requiredCategory, firstOrderOnly) and the caller-supplied cart, never currentRedemptions, so there is nothing for it to race against. Only tryRedeem() itself needs the lock, keeping lock-held time to the smallest possible critical section.',
    'BOGO assumes every item in the cart is priced identically (cartTotal / itemCount) rather than accepting itemized line prices — a deliberate simplification matching this module\'s scalar cart-total API; a real promotions engine would need the actual per-item prices to know which specific item becomes free.',
    'Expiry and the redemption-limit race are checked as two entirely separate steps (isExpired() first, tryRedeem() under the lock second) rather than one atomic operation — acceptable because expiry is a pure function of wall-clock time with no shared mutable counter to race on, unlike the redemption budget.',
  ],
  summary: 'A coupon engine whose centerpiece is the classic bounded-counter check-then-act race, closed the same way every per-entity-lock module in this portfolio closes it: Coupon#tryRedeem holds "read count, compare to limit, increment" as one atomic block under that coupon\'s own fair ReentrantLock. A Strategy-resolved discount calculation (percentage/flat/BOGO) and a three-link Chain of Responsibility eligibility check (minimum cart value, category restriction, first-order-only) gate every application, each independently unit-tested and each able to report exactly which condition rejected a cart.',
  highlights: [
    'The redemption-limit race proven directly: a 300-round repeated test races 12 threads against a coupon with exactly 3 redemptions remaining, asserting exactly 3 succeed and the coupon\'s own counter lands exactly at its limit — never more, every round.',
    'A real, independently-provable Chain of Responsibility: EligibilityChainTest proves the three handlers fire in the documented order, including a cart that would fail ALL THREE conditions simultaneously — proving min-cart-value genuinely fires first, not just that rejection happens somehow.',
    'BOGO genuinely diverges from the other two strategies, not just in name: DiscountStrategyTest proves it produces a different result than an equivalent-looking percentage-off on the identical cart, because it is the only strategy that reads itemCount at all.',
  ],
};

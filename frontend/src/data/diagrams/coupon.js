// classDiagrams — coupon
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Coupon / Promotion Engine — Class Diagram',
  classes: [
    {
      name: 'CouponService',
      stereotype: 'service',
      fields: [
        '- repository: CouponRepository',
        '- chainFactory: EligibilityChainFactory',
        '- strategyFactory: DiscountStrategyFactory',
      ],
      methods: [
        '+ createCoupon(...): Coupon',
        '+ apply(code, cart): ApplyResult',
        '- doApply(repo, code, cart): ApplyResult',
      ],
    },
    {
      name: 'CouponRepository',
      stereotype: 'repository',
      fields: ['- coupons: ConcurrentHashMap<String, Coupon>'],
      methods: ['+ save(coupon): void', '+ get(code): Coupon', '+ getAll(): List<Coupon>', '+ reset(): void'],
    },
    {
      name: 'Coupon',
      fields: [
        '- code: String',
        '- discountType: DiscountType',
        '- discountValue: double',
        '- minCartValue: double',
        '- requiredCategory: String',
        '- firstOrderOnly: boolean',
        '- maxRedemptions: int',
        '- currentRedemptions: int',
        '- couponLock: ReentrantLock',
      ],
      methods: [
        '+ tryRedeem(): boolean  // the only place currentRedemptions is ever mutated',
        '+ isExpired(): boolean',
        '+ getLock(): ReentrantLock',
      ],
    },
    {
      name: 'DiscountType',
      stereotype: 'enum',
      fields: ['PERCENTAGE_OFF', 'FLAT_OFF', 'BOGO'],
      methods: [],
    },
    {
      name: 'CartContext',
      fields: ['- cartTotal: double', '- itemCount: int', '- category: String', '- firstOrder: boolean'],
      methods: [],
    },
    {
      name: 'DiscountStrategy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ apply(cart, discountValue): double'],
    },
    {
      name: 'PercentageOffStrategy',
      fields: ['implements DiscountStrategy'],
      methods: ['+ apply(...): double'],
    },
    {
      name: 'FlatOffStrategy',
      fields: ['implements DiscountStrategy'],
      methods: ['+ apply(...): double'],
    },
    {
      name: 'BogoStrategy',
      fields: ['implements DiscountStrategy'],
      methods: ['+ apply(...): double  // every 2nd item free, depends on itemCount'],
    },
    {
      name: 'DiscountStrategyFactory',
      stereotype: 'resolver',
      fields: [],
      methods: ['+ forType(type): DiscountStrategy'],
    },
    {
      name: 'EligibilityHandler',
      stereotype: 'abstract',
      fields: ['- next: EligibilityHandler'],
      methods: [
        '+ setNext(next): EligibilityHandler',
        '+ check(coupon, cart): Optional<String>',
        '# evaluate(coupon, cart): Optional<String>',
      ],
    },
    {
      name: 'MinCartValueHandler',
      fields: ['extends EligibilityHandler'],
      methods: ['# evaluate(...): Optional<String>  // cart total below the coupon minimum'],
    },
    {
      name: 'CategoryRestrictionHandler',
      fields: ['extends EligibilityHandler'],
      methods: ['# evaluate(...): Optional<String>  // cart category does not match'],
    },
    {
      name: 'FirstOrderOnlyHandler',
      fields: ['extends EligibilityHandler'],
      methods: ['# evaluate(...): Optional<String>  // not the customer\'s first order'],
    },
    {
      name: 'EligibilityChainFactory',
      stereotype: 'factory',
      fields: ['- chainHead: EligibilityHandler'],
      methods: ['+ run(coupon, cart): EligibilityResult'],
    },
    {
      name: 'EligibilityResult',
      fields: ['- eligible: boolean', '- rejectionReason: String'],
      methods: ['+ eligible(): EligibilityResult', '+ rejected(reason): EligibilityResult'],
    },
  ],
  relationships: [
    { from: 'CouponService', to: 'CouponRepository', label: 'reads/writes' },
    { from: 'CouponService', to: 'EligibilityChainFactory', label: 'runs eligibility chain via' },
    { from: 'CouponService', to: 'DiscountStrategyFactory', label: 'computes discount via' },
    { from: 'DiscountStrategyFactory', to: 'DiscountStrategy', label: 'resolves' },
    { from: 'PercentageOffStrategy', to: 'DiscountStrategy', label: 'implements', dashed: true },
    { from: 'FlatOffStrategy', to: 'DiscountStrategy', label: 'implements', dashed: true },
    { from: 'BogoStrategy', to: 'DiscountStrategy', label: 'implements', dashed: true },
    { from: 'EligibilityChainFactory', to: 'EligibilityHandler', label: 'wires chain head' },
    { from: 'MinCartValueHandler', to: 'EligibilityHandler', label: 'extends' },
    { from: 'CategoryRestrictionHandler', to: 'EligibilityHandler', label: 'extends' },
    { from: 'FirstOrderOnlyHandler', to: 'EligibilityHandler', label: 'extends' },
    { from: 'EligibilityHandler', to: 'CartContext', label: 'evaluates' },
    { from: 'EligibilityChainFactory', to: 'EligibilityResult', label: 'returns' },
    { from: 'CouponRepository', to: 'Coupon', label: 'stores' },
    { from: 'Coupon', to: 'DiscountType', label: 'has' },
  ],
};

// classDiagrams — payment
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Payment Gateway — Class Diagram',
  classes: [
    {
      name: 'PaymentService',
      stereotype: 'service',
      fields: [
        '- repository: PaymentRepository',
        '- chainFactory: FraudCheckChainFactory',
        '- paymentProcessor: PaymentGatewayProcessor',
        '- idempotencyCache: Map<String, Payment>',
        '- idempotencyKeyLocks: Map<String, Object>',
      ],
      methods: [
        '+ charge(idempotencyKey, payerId, amount, method): Payment',
        '+ refund(paymentId): Payment',
        '- doCharge(...): Payment',
      ],
    },
    {
      name: 'PaymentRepository',
      stereotype: 'repository',
      fields: ['- payments: ConcurrentHashMap<String, Payment>'],
      methods: [
        '+ save(payment): void',
        '+ get(paymentId): Payment',
        '+ getByPayer(payerId): List<Payment>',
        '+ reset(): void',
      ],
    },
    {
      name: 'Payment',
      fields: [
        '- id: String',
        '- idempotencyKey: String',
        '- payerId: String',
        '- amount: double',
        '- method: PaymentMethodType',
        '- status: PaymentStatus',
        '- transactionId: String',
        '- paymentLock: ReentrantLock',
      ],
      methods: [
        '+ transitionTo(target: PaymentStatus): void  // the only place status is ever assigned',
        '+ getLock(): ReentrantLock',
      ],
    },
    {
      name: 'PaymentStatus',
      stereotype: 'enum',
      fields: ['INITIATED', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED'],
      methods: [
        '+ canTransitionTo(next): boolean',
        '+ allowedNext(): Set<PaymentStatus>',
        '+ isTerminal(): boolean',
      ],
    },
    {
      name: 'PaymentMethodType',
      stereotype: 'enum',
      fields: ['CREDIT_CARD', 'UPI', 'WALLET'],
      methods: [],
    },
    {
      name: 'PaymentMethodStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ process(paymentId, amount): String',
        '+ getMethod(): PaymentMethodType',
      ],
    },
    {
      name: 'CreditCardPaymentMethodStrategy',
      fields: ['implements PaymentMethodStrategy'],
      methods: ['+ process(...): String'],
    },
    {
      name: 'UpiPaymentMethodStrategy',
      fields: ['implements PaymentMethodStrategy'],
      methods: ['+ process(...): String'],
    },
    {
      name: 'WalletPaymentMethodStrategy',
      fields: ['implements PaymentMethodStrategy'],
      methods: ['+ process(...): String'],
    },
    {
      name: 'PaymentGatewayProcessor',
      stereotype: 'resolver',
      fields: [],
      methods: ['+ process(paymentId, amount, method): String'],
    },
    {
      name: 'FraudCheckHandler',
      stereotype: 'abstract',
      fields: ['- nextHandler: FraudCheckHandler'],
      methods: [
        '+ setNext(next: FraudCheckHandler): FraudCheckHandler',
        '+ check(context: FraudCheckContext): FraudCheckResult',
        '# evaluate(context): Optional<String>',
      ],
    },
    {
      name: 'VelocityCheckHandler',
      fields: ['extends FraudCheckHandler'],
      methods: ['# evaluate(...): Optional<String>  // too many recent charges from this payer'],
    },
    {
      name: 'BlacklistCheckHandler',
      fields: ['extends FraudCheckHandler'],
      methods: ['# evaluate(...): Optional<String>  // a known-blacklisted payer id'],
    },
    {
      name: 'AmountLimitHandler',
      fields: ['extends FraudCheckHandler'],
      methods: ['# evaluate(...): Optional<String>  // over the per-transaction ceiling'],
    },
    {
      name: 'FraudCheckChainFactory',
      stereotype: 'factory',
      fields: ['- chainHead: FraudCheckHandler'],
      methods: ['+ run(context: FraudCheckContext): FraudCheckResult'],
    },
    {
      name: 'FraudCheckContext',
      fields: [
        '- payerId: String',
        '- amount: double',
        '- method: PaymentMethodType',
        '- recentChargeCountForPayer: int',
      ],
      methods: [],
    },
    {
      name: 'FraudCheckResult',
      fields: ['- approved: boolean', '- rejectionReason: String'],
      methods: ['+ approved(): FraudCheckResult', '+ rejected(reason): FraudCheckResult'],
    },
  ],
  relationships: [
    { from: 'PaymentService', to: 'PaymentRepository', label: 'reads/writes' },
    { from: 'PaymentService', to: 'FraudCheckChainFactory', label: 'runs fraud chain via' },
    { from: 'PaymentService', to: 'PaymentGatewayProcessor', label: 'processes charge via' },
    { from: 'PaymentGatewayProcessor', to: 'PaymentMethodStrategy', label: 'resolves' },
    { from: 'CreditCardPaymentMethodStrategy', to: 'PaymentMethodStrategy', label: 'implements', dashed: true },
    { from: 'UpiPaymentMethodStrategy', to: 'PaymentMethodStrategy', label: 'implements', dashed: true },
    { from: 'WalletPaymentMethodStrategy', to: 'PaymentMethodStrategy', label: 'implements', dashed: true },
    { from: 'FraudCheckChainFactory', to: 'FraudCheckHandler', label: 'wires chain head' },
    { from: 'VelocityCheckHandler', to: 'FraudCheckHandler', label: 'extends' },
    { from: 'BlacklistCheckHandler', to: 'FraudCheckHandler', label: 'extends' },
    { from: 'AmountLimitHandler', to: 'FraudCheckHandler', label: 'extends' },
    { from: 'FraudCheckHandler', to: 'FraudCheckContext', label: 'evaluates' },
    { from: 'FraudCheckHandler', to: 'FraudCheckResult', label: 'returns' },
    { from: 'PaymentRepository', to: 'Payment', label: 'stores' },
    { from: 'Payment', to: 'PaymentStatus', label: 'has' },
    { from: 'Payment', to: 'PaymentMethodType', label: 'has' },
  ],
};

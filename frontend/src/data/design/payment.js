// designDetails — payment
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Payment Gateway — Design Details',
  requirements: [
    'A simplified Stripe/Razorpay-shaped gateway: charge (authorize+capture in one call), refund, with a fraud-check pipeline in front of every charge.',
    'Strategy Pattern for payment methods: PaymentMethodStrategy (CreditCard/UPI/Wallet), resolved by PaymentGatewayProcessor via a Map.',
    'Chain of Responsibility for fraud checks: VelocityCheckHandler -> BlacklistCheckHandler -> AmountLimitHandler, each able to short-circuit the chain to a rejection.',
    'State Machine payment lifecycle: INITIATED -> AUTHORIZED -> CAPTURED -> REFUNDED / FAILED, declared once and enforced through one Payment#transitionTo gate.',
    'Idempotent charge submission: a client retrying the same idempotencyKey (e.g. after a network timeout) must never be charged twice, and must always get back the identical Payment.',
    'Race-Free Refund: two concurrent refund attempts on the same payment must serialize, with the state machine rejecting the losing transition.',
    'Isolated Concurrency Simulation: an isolated /api/payment/sim/* sandbox (a second PaymentRepository instance) with a live 6-way double-submit race, so the demo can never touch a live payment ledger.',
  ],
  entities: [
    {
      name: 'PaymentService',
      description: 'Spring @Service facade owning charge/refund and the isolated simulation engine.',
      fields: [
        { name: 'repository', type: 'PaymentRepository', description: 'Live payment ledger' },
        { name: 'chainFactory', type: 'FraudCheckChainFactory', description: 'Wires and runs the fraud pipeline' },
        { name: 'paymentProcessor', type: 'PaymentGatewayProcessor', description: 'Resolves PaymentMethodType to a concrete strategy' },
        { name: 'idempotencyCache', type: 'Map<String, Payment>', description: 'Idempotency key -> the Payment it resolved to, populated only after a successful charge' },
        { name: 'idempotencyKeyLocks', type: 'Map<String, Object>', description: 'A lazily-created lock object per idempotency key' },
      ],
      methods: [
        { name: 'charge(idempotencyKey, payerId, amount, method)', returns: 'Payment', description: 'Runs the fraud chain, then AUTHORIZED -> CAPTURED, deduped by idempotency key' },
        { name: 'refund(paymentId)', returns: 'Payment', description: 'CAPTURED -> REFUNDED under that payment\'s own lock' },
      ],
    },
    {
      name: 'Payment',
      description: 'A charge attempt. status is mutated only through transitionTo, the one place its lifecycle can move.',
      fields: [
        { name: 'id', type: 'String', description: 'Payment identifier' },
        { name: 'idempotencyKey', type: 'String', description: 'Client-supplied dedup key, nullable' },
        { name: 'payerId', type: 'String', description: 'Who is being charged' },
        { name: 'amount', type: 'double', description: 'Charge amount' },
        { name: 'method', type: 'PaymentMethodType', description: 'CREDIT_CARD / UPI / WALLET' },
        { name: 'status', type: 'PaymentStatus', description: 'INITIATED / AUTHORIZED / CAPTURED / REFUNDED / FAILED' },
        { name: 'paymentLock', type: 'ReentrantLock', description: 'Fair, per-payment lock — held across capture and refund transitions' },
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Throws IllegalStateException on any move not in PaymentStatus#allowedNext' },
      ],
    },
    {
      name: 'FraudCheckHandler (Chain of Responsibility, abstract)',
      description: 'Each concrete handler decides independently whether to reject; the base class owns delegating to the next handler when this one passes.',
      fields: [],
      methods: [
        { name: 'check(context)', returns: 'FraudCheckResult', description: 'Template method: evaluate(), then delegate to nextHandler if approved' },
        { name: 'evaluate(context)', returns: 'Optional<String>', description: 'Abstract — empty means pass, present is the rejection reason' },
      ],
    },
    {
      name: 'VelocityCheckHandler / BlacklistCheckHandler / AmountLimitHandler',
      description: 'The three concrete links, wired in that fixed order by FraudCheckChainFactory.',
      fields: [],
      methods: [
        { name: 'evaluate(context)', returns: 'Optional<String>', description: 'Velocity: too many recent charges from this payer. Blacklist: a known-bad payer id. AmountLimit: over the per-transaction ceiling.' },
      ],
    },
    {
      name: 'PaymentStatus (enum)',
      description: 'Declares its own legal-next-states set — the same idiom as uber.model.RideStatus.',
      fields: [],
      methods: [
        { name: 'canTransitionTo(next)', returns: 'boolean', description: 'True if next is in this status\'s allowedNext set' },
      ],
    },
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory-shaped Resolver',
      used: true,
      explanation: 'PaymentGatewayProcessor resolves PaymentMethodType (CREDIT_CARD/UPI/WALLET) to a PaymentMethodStrategy via a Map built once from every injected strategy bean — the same shape as shoppingcart.payment.ShoppingCartPaymentProcessor.',
    },
    {
      name: 'Chain of Responsibility',
      used: true,
      explanation: 'VelocityCheckHandler -> BlacklistCheckHandler -> AmountLimitHandler, wired by FraudCheckChainFactory with the same setNext-linking shape as logging.chain.LogHandlerChainBuilder. Each handler is independently unit-testable and the chain short-circuits on the first rejection.',
    },
    {
      name: 'State Pattern (declared transition table)',
      used: true,
      explanation: 'PaymentStatus declares its own legal-next-states set, and Payment#transitionTo is the single enforcement point — a payment can never skip AUTHORIZED or move backward once CAPTURED.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'PaymentRepository is pure CRUD; fraud decisions live in the chain handlers; payment-method processing lives in the strategies; PaymentService only orchestrates.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A fourth fraud check (e.g. GeoMismatchHandler) is one new handler class and one line in FraudCheckChainFactory\'s constructor — no existing handler changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every FraudCheckHandler honors the same evaluate() contract; FraudCheckChainFactory never needs to know which concrete handler it is talking to.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'A Payment\'s ReentrantLock and status field are private; every mutation goes through transitionTo.' },
    { name: 'Polymorphism', description: 'PaymentService calls chainFactory.run(context) and paymentProcessor.process(...) without knowing which concrete handlers or strategy are involved.' },
    { name: 'Template Method', description: 'FraudCheckHandler#check is a template method: it always calls evaluate() then conditionally delegates to nextHandler, with only evaluate() varying per subclass.' },
  ],
  extensibility: [
    { area: 'Separate authorize/capture endpoints', description: 'Currently charge() does both hops internally in one call; splitting them into POST /authorize and POST /{id}/capture would mean exposing an AUTHORIZED payment between the two calls instead of always going straight to CAPTURED.', difficulty: 'Medium' },
    { area: 'Partial refunds', description: 'InvalidRefundException already anticipates refunding more than was charged; a partialRefund(paymentId, amount) would need Payment to track a running refundedAmount instead of a single terminal REFUNDED status.', difficulty: 'Medium' },
    { area: 'Webhook-style async notifications', description: 'A real gateway would push charge/refund outcomes to a merchant webhook; this module returns them synchronously in the REST response instead, matching this portfolio\'s no-external-network-call constraint.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'charge() performs the full INITIATED -> AUTHORIZED -> CAPTURED sequence in one call rather than exposing separate authorize/capture endpoints — simpler for the demo and for the idempotency story, at the cost of not modeling a real gateway\'s hold-then-settle window where a merchant might authorize now and capture hours later.',
    'The idempotency mechanism is a per-key synchronized lock (mirroring shoppingcart.service.ShoppingCartService#placeOrder) rather than a lock-free ConcurrentHashMap.putIfAbsent claim. A lock-free claim was considered and rejected: it can only atomically claim that a payment id owns the key, not that the actual Payment behind it has finished being created — a concurrent loser could observe a "claimed" key before the winner ever saves the Payment object. The lock-based version guarantees the loser blocks until the winner is fully done.',
    'VelocityCheckHandler\'s window is a fixed 10 seconds and its limit a fixed 3 charges, both hardcoded rather than configurable per merchant — reasonable for a single-tenant demo, a real gateway would make both tunable.',
  ],
  summary: 'A Stripe/Razorpay-shaped payment gateway whose centerpiece is closing the classic double-submit race: a client retrying the same idempotencyKey after a timeout must never be charged twice, and must always get back the identical Payment. A per-idempotency-key lock (not a lock-free CAS, deliberately) wraps the whole check-cache -> charge -> populate-cache sequence, mirroring shoppingcart\'s own idempotent-checkout precedent. A three-link Chain of Responsibility fraud pipeline (velocity, blacklist, amount-limit) gates every charge, and a declared PaymentStatus transition table gives the INITIATED -> AUTHORIZED -> CAPTURED -> REFUNDED/FAILED lifecycle real structure. A second race — concurrent refund attempts on one payment — is closed the same way every other stateful entity in this portfolio closes it: a per-entity lock, re-checked status inside the lock.',
  highlights: [
    'The double-submit race: a per-idempotency-key lock proven with a 300-round repeated concurrent-charge test asserting exactly one Payment is ever created and the underlying payment strategy is invoked exactly once, not once per retry.',
    'A real, independently-provable Chain of Responsibility: FraudCheckChainTest proves the three handlers fire in order and short-circuit correctly, including a payer who would fail BOTH the velocity and blacklist checks — proving velocity genuinely fires first, not just that this payer gets rejected somehow.',
    'The concurrent-refund race: a 300-round repeated test firing 4 simultaneous refund attempts at one CAPTURED payment, asserting exactly one succeeds and the rest are cleanly rejected by the state machine, never silently double-crediting.',
    'A real cross-module bug caught before shipping: the first draft named this module\'s processor class PaymentProcessor, which collided with an unrelated existing bean of the identical simple name in com.lld.concertticket — Spring refused to boot the entire application context. Renamed to PaymentGatewayProcessor.',
  ],
};

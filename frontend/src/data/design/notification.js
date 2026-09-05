export default {
  title: 'Notification System — Design Details',
  requirements: [
    'Send a notification to a recipient over a chosen channel (Email, SMS, Push, WhatsApp), carrying arbitrary template data.',
    'Every notification type (OTP, Transactional, Promotional, Alert) carries an inherent default priority, overridable per request.',
    'Respect per-recipient, per-type, per-channel opt-out preferences — an opted-out send is suppressed, never delivered.',
    'Idempotent sends: the same idempotency key submitted twice (or racing concurrently) must resolve to exactly one dispatched notification, never two.',
    'Priority-ordered dispatch: HIGH-priority notifications (OTP, Alert) always dispatch ahead of LOW-priority ones (Promotional), regardless of enqueue order.',
    'Retry with exponential backoff on channel failure, up to a configurable attempt budget, then a terminal FAILED status.',
  ],
  entities: [
    {
      name: 'NotificationService',
      description: 'Facade the controller delegates to wholesale. Owns the production repository/channel factory plus a completely separate, isolated sandbox pair for the /sim/* engine.',
      fields: [
        { name: 'pendingQueue', type: 'PriorityBlockingQueue<Notification>', description: 'Ordered by Priority then createdAt — every Java enum is Comparable by ordinal, so HIGH sorts first for free' },
        { name: 'idempotencyLocks', type: 'ConcurrentHashMap<String, ReentrantLock>', description: 'Per-idempotency-key lock guarding the check-then-act race' },
        { name: 'idempotencyIndex', type: 'ConcurrentHashMap<String, Long>', description: 'Which notification a key already resolved to' },
      ],
      methods: [
        { name: 'send(recipientId, type, channel, templateData, idempotencyKey, priorityOverride)', returns: 'Notification', description: 'Atomically checks the idempotency key and either returns the existing notification or creates, persists and (only if newly created) enqueues a new one' },
        { name: 'drainOnce()', returns: 'Notification', description: 'Pops exactly one notification and performs exactly one delivery attempt — what both real workers and priority-ordering tests call' },
      ],
    },
    {
      name: 'Notification',
      description: 'One message: who, what kind, which channel, current lifecycle status, and how many delivery attempts it has made.',
      fields: [], methods: [],
    },
    {
      name: 'NotificationStatus',
      stereotype: 'enum',
      description: 'PENDING -> SENT | RETRYING | SUPPRESSED | FAILED; RETRYING -> SENT | FAILED. A declared transition table enforced through one gate, the same idiom as uber.model.RideStatus.',
      fields: [], methods: [
        { name: 'canTransitionTo(next)', returns: 'boolean', description: '' },
      ],
    },
    {
      name: 'NotificationChannel',
      stereotype: 'interface',
      description: 'Strategy: EmailChannel, SmsChannel, PushChannel and WhatsAppChannel each simulate a delivery with a configurable failure probability, resolved by NotificationChannelFactory.',
      fields: [], methods: [{ name: 'send(notification)', returns: 'void', description: 'Throws ChannelDeliveryException on simulated failure' }],
    },
    {
      name: 'NotificationChannelFactory',
      description: 'Resolves a ChannelType to its concrete NotificationChannel — a real Factory, not an if/else at the call site. The production constructor wires the four real channel beans; a map constructor lets tests and the /sim/* sandbox swap in channels with forced failure rates.',
      fields: [], methods: [{ name: 'getChannel(type)', returns: 'NotificationChannel', description: 'Throws UnsupportedChannelException if no implementation is registered' }],
    },
    {
      name: 'RetryPolicy',
      stereotype: 'interface',
      description: 'Strategy for whether and how long to wait before another delivery attempt. ExponentialBackoffRetryPolicy is the one production implementation: delay doubles each attempt up to a max, capped at a max attempt count.',
      fields: [], methods: [
        { name: 'shouldRetry(attemptCount)', returns: 'boolean', description: '' },
        { name: 'backoffFor(attemptCount)', returns: 'Duration', description: '' },
      ],
    },
    {
      name: 'UserPreference',
      description: 'One recipient\'s opt-in/opt-out choice for a specific (type, channel) pair. Checked at send time; an opted-out combination transitions the notification straight to SUPPRESSED without ever touching a channel.',
      fields: [], methods: [],
    },
  ],
  designPatterns: [
    { name: 'Strategy Pattern (NotificationChannel)', used: true, explanation: 'EmailChannel, SmsChannel, PushChannel and WhatsAppChannel are genuinely different delivery behaviors behind one interface, resolved by NotificationChannelFactory.' },
    { name: 'Strategy Pattern (RetryPolicy)', used: true, explanation: 'ExponentialBackoffRetryPolicy computes backoff and attempt budget; a different policy (e.g. fixed-delay, no-retry) would be a drop-in replacement.' },
    { name: 'Factory Pattern', used: true, explanation: 'NotificationChannelFactory centralizes ChannelType-to-implementation resolution in one place instead of scattering it across call sites.' },
    { name: 'Facade Pattern', used: true, explanation: 'NotificationService is the single entry point the controller talks to, hiding the production/sandbox split and the priority queue/worker pool behind it.' },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'NotificationRepository only stores and looks up notifications and preferences; all dispatch, retry and idempotency logic lives in NotificationService; all delivery simulation lives in the channel implementations.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A new delivery channel or retry policy is a new class plus one factory branch — NotificationService\'s dispatch loop never changes.' },
    { name: 'Dependency Inversion Principle (DIP)', description: 'NotificationService depends on the NotificationChannel and RetryPolicy interfaces, never a concrete channel or backoff formula.' },
  ],
  oopConcepts: [
    { name: 'Polymorphism', description: 'send() and shouldRetry()/backoffFor() dispatch to completely different logic per concrete channel/policy without a single instanceof check in the service.' },
    { name: 'Encapsulation', description: 'Notification.status changes only through the service\'s one transition() gate; no caller ever assigns status directly.' },
  ],
  extensibility: [
    { area: 'A new delivery channel (e.g. Slack, in-app)', description: 'A new NotificationChannel implementation plus one NotificationChannelFactory registration — the dispatch loop is untouched.', difficulty: 'Easy' },
    { area: 'Per-recipient rate limiting (max N notifications/hour)', description: 'A check alongside the preference check in createAndClaim, backed by a small per-recipient counter — additive, not a redesign.', difficulty: 'Medium' },
    { area: 'Batched digest notifications (roll up several into one)', description: 'A materially different dispatch model — a scheduled aggregation window instead of one-shot immediate dispatch.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'Delivery is simulated with a configurable failure probability rather than calling a real email/SMS provider — this module is about the dispatch machinery (priority, retry, idempotency), not third-party integration.',
    'The priority queue is a single shared PriorityBlockingQueue drained by a small fixed worker pool, not a per-priority queue set — simpler to reason about, at the cost of a HIGH-priority item still queueing (briefly) behind whatever a worker already popped.',
  ],
  summary: 'A notification dispatch service whose centerpiece is a check-then-act race closed by a per-idempotency-key lock: two concurrent sends carrying the same key resolve to exactly one notification and one enqueue, verified by a 200-round repeated concurrency test after an early draft (enqueuing based on status alone, which a duplicate call also observes as PENDING) was caught by exactly that test. Priority-ordered dispatch, per-preference suppression, and exponential-backoff retry round out the pipeline, with a fully isolated /sim/* sandbox for the interactive walkthrough.',
  highlights: [
    'The idempotency guarantee: a per-key ReentrantLock (lazily created via computeIfAbsent) guards check-and-record as one atomic step, and only the call that actually created the notification may enqueue it — a duplicate call resolving to the same still-PENDING instance must not enqueue it again.',
    'A real Strategy + Factory for delivery channels: four channels behind one interface, resolved without an if/else at any call site.',
    'Priority dispatch that costs nothing extra: every Java enum is Comparable by ordinal, so HIGH.compareTo(LOW) < 0 falls out of the enum declaration order for free.',
    'A declared NotificationStatus transition table (mirroring uber.model.RideStatus) enforced through one gate, so an illegal status jump is impossible to introduce by accident.',
  ],
};

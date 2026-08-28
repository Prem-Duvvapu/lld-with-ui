// designDetails — pubsub
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
// Grounded in the real backend (com.lld.pubsub.*) — every entity, method and pattern
// listed below exists in code and is exercised by PubSubServiceTest / SubscriberWorkerTest /
// PubSubRepositoryTest / PubSubConcurrencyTest.

export default {
  title: 'Pub/Sub System (Message Broker) — Design Details',
  tldr: [
    'Topic-based broker where every subscriber gets its own dedicated worker thread draining a bounded ArrayBlockingQueue<Message> — strict FIFO delivery per subscriber, guaranteed by construction rather than by locking.',
    'Broadcast publish() is non-blocking and never throws: a subscriber whose queue is full is reported back as a rejected id, so one slow consumer can never stall delivery to the rest of the topic.',
    'A separate strict, single-target send (publishToSubscriber) exists for point-to-point redelivery — it throws QueueFullException (409, queue momentarily full) or DispatchFailedException (410, worker already stopped) instead of swallowing the failure.',
    'Typed exception hierarchy (PubSubException) covers every real failure mode: unknown topic, unknown subscriber, duplicate subscription, full queue, and a dispatch to a stopped worker.',
    'Isolated /sim/* sandbox runs its own Broker + PubSubRepository pair with its own telemetry event log, so the interactive demo can never touch the live topics seeded by PubSubInitializer.'
  ],
  requirements: [
    'Topic-based publish-subscribe messaging — publishers send messages to topics, subscribers receive messages from topics they subscribe to',
    'Fan-out — every active subscriber on a topic receives every message published to it',
    'Strict per-subscriber message ordering — each subscriber sees messages in the exact order they were published, even under concurrent publishers',
    'Non-blocking publish — a publisher never waits on a slow or stuck subscriber; publish() returns as soon as the message is handed to every subscriber\'s queue',
    'Bounded per-subscriber backpressure — each subscriber has a fixed-capacity queue; when full, new messages for that subscriber are dropped and reported, not silently lost or infinitely buffered',
    'Reject rather than silently replace on duplicate subscription — re-subscribing an already-active (topic, subscriberId) pair is a conflict, not an implicit reset',
    'Point-to-point redelivery — a caller can address exactly one subscriber directly and learn for certain whether that specific delivery succeeded, failed on a full queue, or failed because the subscriber is gone'
  ],
  entities: [
    {
      name: 'Broker',
      description: 'Owns every Topic by name. The entry point for create/subscribe/unsubscribe/publish; delegates the actual fan-out and backpressure decisions to Topic.',
      fields: [
        { name: 'topics', type: 'ConcurrentHashMap<String, Topic>', description: 'All registered topics indexed by name — lock-free reads on the hot publish path' },
        { name: 'messageIdGen', type: 'AtomicLong', description: 'Generates globally unique message ids ("MSG-N")' }
      ],
      methods: [
        { name: 'createTopic(name)', returns: 'void', description: 'Creates a topic if it doesn\'t already exist (idempotent, putIfAbsent)' },
        { name: 'subscribe(topicName, subscriber, capacity)', returns: 'void', description: 'Registers a subscriber on a topic; throws TopicNotFoundException or DuplicateSubscriptionException' },
        { name: 'publish(topicName, payload, publisherId, headers)', returns: 'List<String>', description: 'Broadcasts to every subscriber; returns the ids whose queue was full (never throws for that)' },
        { name: 'publishToSubscriber(topicName, subscriberId, payload, publisherId, headers)', returns: 'void', description: 'Strict single-target send; throws QueueFullException / DispatchFailedException' },
        { name: 'shutdown()', returns: 'void', description: 'Stops every SubscriberWorker thread across every topic gracefully' }
      ]
    },
    {
      name: 'Topic',
      description: 'One logical channel. Holds a lock-free list of SubscriberWorkers (one per active subscriber) and the message counter for this channel.',
      fields: [
        { name: 'name', type: 'String', description: 'Unique topic identifier' },
        { name: 'workers', type: 'CopyOnWriteArrayList<SubscriberWorker>', description: 'Read-mostly list of active per-subscriber workers — publish iterates it without a lock' },
        { name: 'publishedCount', type: 'AtomicLong', description: 'Total messages ever published to this topic' }
      ],
      methods: [
        { name: 'addSubscriber(subscriber, capacity)', returns: 'void', description: 'Spawns a new SubscriberWorker; throws DuplicateSubscriptionException if this id is already active here' },
        { name: 'removeSubscriber(subscriberId)', returns: 'void', description: 'Stops and removes that subscriber\'s worker; throws SubscriberNotFoundException if it isn\'t registered' },
        { name: 'publish(message)', returns: 'List<String>', description: 'Enqueues to every worker; returns the ids that were rejected on a full queue' },
        { name: 'publishToOne(subscriberId, message)', returns: 'void', description: 'Strict send to one worker; throws SubscriberNotFoundException / QueueFullException / DispatchFailedException' }
      ]
    },
    {
      name: 'SubscriberWorker',
      description: 'A real background thread (Runnable, own daemon Thread) dedicated to exactly one subscriber, sequentially draining a bounded ArrayBlockingQueue<Message>. This is what makes per-subscriber FIFO ordering and backpressure isolation structural rather than a locking convention.',
      fields: [
        { name: 'subscriber', type: 'Subscriber', description: 'The consumer this worker drains messages into' },
        { name: 'queue', type: 'ArrayBlockingQueue<Message>', description: 'Bounded — offer() fails fast instead of growing unbounded' },
        { name: 'deliveredCount / rejectedCount / errorCount', type: 'AtomicLong', description: 'Live telemetry counters read by the /sim snapshot without locking' },
        { name: 'running', type: 'volatile boolean', description: 'Graceful-stop flag; run() keeps draining the queue after this flips false until it is actually empty' }
      ],
      methods: [
        { name: 'enqueue(message)', returns: 'boolean', description: 'Broadcast path: never throws, returns false on a full queue or a stopped worker' },
        { name: 'enqueueOrThrow(message)', returns: 'void', description: 'Strict path: throws QueueFullException (full) or DispatchFailedException (stopped)' },
        { name: 'run()', returns: 'void', description: 'Loop: poll(200ms) → subscriber.consume(message); an exception from consume() increments errorCount and is logged, never kills the thread' },
        { name: 'stopGracefully()', returns: 'void', description: 'Flips running=false and interrupts the thread, but the run() loop keeps draining whatever was already queued' }
      ]
    },
    {
      name: 'Subscriber',
      description: 'Consumer interface. Broker/Topic/SubscriberWorker never depend on a concrete implementation — this is the seam that makes new consumer types (a database sink, a webhook forwarder) pure additions.',
      fields: [],
      methods: [
        { name: 'getId()', returns: 'String', description: '' },
        { name: 'getName()', returns: 'String', description: '' },
        { name: 'consume(message)', returns: 'void', description: 'Runs on the subscriber\'s own dedicated worker thread, never the publisher\'s' }
      ]
    },
    {
      name: 'PrintSubscriber / LoggingSubscriber / SlowSubscriber',
      description: 'Three Subscriber implementations seeded by PubSubInitializer and selectable from the UI. PrintSubscriber and LoggingSubscriber consume instantly; SlowSubscriber sleeps processDelayMs inside consume() — the deliberate stand-in for "a subscriber that can\'t keep up", used to provoke real backpressure against its own bounded queue without affecting any other subscriber on the same topic.',
      fields: [
        { name: 'receivedMessages / logs', type: 'CopyOnWriteArrayList', description: 'Thread-safe history read by getSubscriberMessages() while the worker thread is still appending to it' }
      ],
      methods: [
        { name: 'consume(message)', returns: 'void', description: 'PrintSubscriber/LoggingSubscriber: instant. SlowSubscriber: Thread.sleep(processDelayMs) first.' }
      ]
    },
    {
      name: 'Message',
      description: 'Immutable value carrier (Lombok @Data @Builder). Message.of(...) stamps timestampEpoch and defaults a null headers map to empty.',
      fields: [
        { name: 'id', type: 'String', description: 'Broker-assigned unique id ("MSG-N")' },
        { name: 'topicName', type: 'String', description: '' },
        { name: 'payload', type: 'String', description: '' },
        { name: 'publisherId', type: 'String', description: '' },
        { name: 'timestampEpoch', type: 'long', description: '' },
        { name: 'headers', type: 'Map<String, String>', description: '' }
      ],
      methods: []
    },
    {
      name: 'PubSubRepository',
      description: 'Subscriber directory keyed by (topicName, subscriberId) rather than subscriber id alone, backed by ConcurrentHashMap. This is what stops the same subscriber id being active on two different topics from clobbering each other\'s message history, and fixes a real thread-safety bug where the map it replaced was a plain, unsynchronized HashMap. The real service and the isolated /sim engine each hold their own separate instance.',
      fields: [
        { name: 'subscribersByKey', type: 'ConcurrentHashMap<String, Subscriber>', description: 'Key = topicName + "::" + subscriberId' }
      ],
      methods: [
        { name: 'save(topicName, subscriber)', returns: 'void', description: '' },
        { name: 'find(topicName, subscriberId)', returns: 'Subscriber', description: '' },
        { name: 'exists(topicName, subscriberId)', returns: 'boolean', description: '' },
        { name: 'remove(topicName, subscriberId)', returns: 'void', description: '' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'Pub-Sub is Observer at scale. Topic is the subject; every SubscriberWorker wraps one observer. Topic#publish notifies all of them without knowing their concrete type — PubSubConcurrencyTest#manyPublishersManySubscribers proves every observer sees every event exactly once.'
    },
    {
      name: 'Producer-Consumer',
      used: true,
      explanation: 'Each SubscriberWorker is a classic bounded-queue producer-consumer: Topic#publish (and any publisher thread) is the producer offering into an ArrayBlockingQueue, the worker\'s own run() loop is the sole consumer. The bound is what makes backpressure real instead of aspirational.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'PubSubService is a Spring-managed singleton facade — one Broker + one PubSubRepository serve every publisher and subscriber in the live system, separate from the sim engine\'s own singleton pair.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'PubSubController never touches Broker, Topic or PubSubRepository directly — PubSubService is the single seam that composes them and is where every topic/subscriber-existence check and typed exception is thrown.'
    },
    {
      name: 'Factory Method',
      used: true,
      explanation: 'PubSubService#createSubscriberInstance is a small factory resolving a "PRINT"/"SLOW"/"LOGGING" type string to the right Subscriber implementation, keeping that branch out of both subscribe() and the /sim equivalent.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Broker owns topic lookup and id generation. Topic owns its subscriber list and the duplicate/not-found checks. SubscriberWorker owns exactly one queue and one thread. PubSubRepository owns the subscriber directory. Each has one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new consumer type is a new Subscriber implementation plus one branch in the factory method — Broker, Topic and SubscriberWorker never change.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Topic and SubscriberWorker depend on the Subscriber interface, never on PrintSubscriber/LoggingSubscriber/SlowSubscriber directly.'
    },
    {
      name: 'Interface Segregation (ISP)',
      description: 'Subscriber exposes exactly three members (id, name, consume) — no ack/filter/retry surface a simple consumer doesn\'t need.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any Subscriber implementation can be dropped into Topic#addSubscriber without Topic or SubscriberWorker caring which one it got — SlowSubscriber substitutes for PrintSubscriber with only a timing difference, never a contract difference.'
    }
  ],
  oopConcepts: [
    {
      name: 'Composition over Inheritance',
      description: 'Broker has-a Map of Topic; Topic has-a list of SubscriberWorker; SubscriberWorker has-a Subscriber and a queue. No inheritance chain anywhere in the dispatch path.',
      alternative: 'A shared thread pool with per-subscriber routing was considered and rejected — see tradeoffs.'
    },
    {
      name: 'Polymorphism — Subscriber interface',
      description: 'SubscriberWorker.run() calls subscriber.consume(message) without a type check; PrintSubscriber, LoggingSubscriber and SlowSubscriber each do something different with that call.',
      alternative: 'A callback/functional interface would work too, but a named interface reads better once implementations start carrying their own state (SlowSubscriber\'s delay, the received-messages history).'
    },
    {
      name: 'Encapsulation — queue and counters stay inside the worker',
      description: 'Nothing outside SubscriberWorker can mutate its queue directly; delivered/rejected/error counts are read-only outside the class, exposed only through getters used for telemetry.',
      alternative: 'Exposing the raw queue would let a caller peek or drain it out of band, breaking the FIFO-per-subscriber guarantee.'
    }
  ],
  extensibility: [
    {
      area: 'Durable / replayable subscriptions',
      description: 'A subscriber that reconnects after being offline currently just re-subscribes and misses everything published while it was gone. Adding a bounded per-topic replay log plus a "since messageId" parameter to subscribe() would give at-least-once redelivery without changing the live dispatch path.',
      difficulty: 'Medium'
    },
    {
      area: 'Message filtering',
      description: 'A Subscriber currently receives every message on a topic it joins. A predicate passed at subscribe time, checked before enqueue() in Topic#publish, would add selective delivery without touching SubscriberWorker.',
      difficulty: 'Easy'
    },
    {
      area: 'Wildcard / hierarchical topics',
      description: '"sports.*" style topic patterns would need Broker#getAllTopics to be matched against a pattern instead of an exact name at publish time — Topic and SubscriberWorker are unaffected.',
      difficulty: 'Medium'
    },
    {
      area: 'Dead-letter handling for the strict send path',
      description: 'publishToSubscriber already tells the caller exactly why a send failed (QueueFullException vs DispatchFailedException); routing those failures into a DLQ topic instead of just propagating the exception is a small addition on top of an already-typed failure signal.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'Chose one dedicated thread per subscriber over a shared thread pool: guarantees strict FIFO per subscriber and total isolation (a stuck subscriber\'s thread can never starve another subscriber\'s queue-drain), at the cost of one live thread per active subscription — fine at demo scale, would need a pool + per-subscriber sequencing at very large subscriber counts.',
    'Broadcast publish() reports a full queue as a rejected id instead of throwing, so one slow consumer never fails the whole publish; the strict publishToSubscriber() exists specifically for callers that need a hard yes/no for one target instead.',
    'Duplicate subscription (same id, same topic) is rejected rather than silently replacing the existing worker — replacing used to drop that worker\'s in-flight queue and counters with no warning; callers who want to change capacity/delay must unsubscribe first.',
    'PubSubRepository keys by (topicName, subscriberId) rather than subscriber id alone, trading one extra string concatenation per lookup for the ability to let the same subscriber id track independent message history per topic.'
  ],
  solid: [
    { principle: 'Single Responsibility', details: 'Topic handles routing and membership; SubscriberWorker manages the queue and its own thread; Subscriber implementations only know how to consume().' },
    { principle: 'Open/Closed', details: 'New Subscriber types (e.g. a WebhookSubscriber) are pure additions — Broker/Topic/SubscriberWorker never change.' }
  ]
};

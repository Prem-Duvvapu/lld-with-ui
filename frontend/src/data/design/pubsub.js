// designDetails — pubsub
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Pub/Sub System (Message Broker) — Design Details',
  tldr: [
    'Topic-based high-throughput message broker featuring Observer pattern and dedicated per-subscriber Producer-Consumer worker threads',
    'Strict FIFO message delivery ordering guaranteed per subscriber by isolating each subscriber in its own ArrayBlockingQueue',
    'Non-blocking publisher dispatch: publish() enqueues to subscriber queues and returns immediately without blocking on slow consumers',
    'Backpressure rejection policy: when subscriber queue is full, new messages are rejected with QueueFullException without stalling the broker',
    'Thread-safe subscriber registration via CopyOnWriteArrayList ensuring lock-free publish iteration during concurrent subscriptions'
  ],
  requirements: [
    'Topic-based publish-subscribe messaging — publishers send messages to topics, subscribers receive messages from topics they subscribe to',
    'Multiple subscribers per topic — each subscriber receives every message published to the topic (fan-out)',
    'Subscriber can specify filters — receive only messages matching certain criteria (e.g., message type, content pattern)',
    'Durable subscriptions — subscriber can disconnect and later receive missed messages (persistent queue per subscriber)',
    'At-least-once delivery — messages are retried until subscriber acknowledges receipt, preventing message loss',
    'Message ordering per topic — messages are delivered to subscribers in the order they were published (FIFO per topic)',
    'Asynchronous publishing — publisher does not block while messages are being delivered to subscribers',
    'Dead letter queue — messages that cannot be delivered after max retries are moved to a DLQ for manual inspection'
  ],
  entities: [
    {
      name: 'Broker',
      description: 'Central message routing hub. Manages topics, routes messages from publishers to subscribers, and handles persistence and retry.',
      fields: [
        {
          name: 'topics',
          type: 'Map<String, Topic>',
          description: 'All registered topics indexed by name'
        },
        {
          name: 'executor',
          type: 'ExecutorService',
          description: 'Thread pool for async message delivery to subscribers'
        },
        {
          name: 'deadLetterQueue',
          type: 'Queue<Message>',
          description: 'Messages that exceeded max delivery retries'
        }
      ],
      methods: [
        {
          name: 'createTopic(name)',
          returns: 'Topic',
          description: 'Creates a new topic for publishing/subscribing'
        },
        {
          name: 'publish(topicName, message)',
          returns: 'void',
          description: 'Publishes a message to all subscribers of the topic'
        },
        {
          name: 'subscribe(topicName, subscriber)',
          returns: 'Subscription',
          description: 'Subscribes a consumer to receive messages from the topic'
        },
        {
          name: 'unsubscribe(subscription)',
          returns: 'void',
          description: 'Removes a subscriber from the topic'
        }
      ]
    },
    {
      name: 'Topic',
      description: 'Logical channel that groups related messages. Maintains subscriber list and message queue. Ensures FIFO delivery order.',
      fields: [
        {
          name: 'name',
          type: 'String',
          description: 'Unique topic identifier'
        },
        {
          name: 'subscribers',
          type: 'List<Subscription>',
          description: 'All active subscriptions with their filters and queues'
        },
        {
          name: 'messageQueue',
          type: 'Queue<Message>',
          description: 'Pending messages yet to be delivered'
        }
      ],
      methods: [
        {
          name: 'addSubscriber(subscription)',
          returns: 'void',
          description: 'Registers a new subscription'
        },
        {
          name: 'removeSubscriber(subId)',
          returns: 'void',
          description: 'Removes a subscription'
        },
        {
          name: 'publish(message)',
          returns: 'void',
          description: 'Enqueues message and dispatches to matching subscribers'
        }
      ]
    },
    {
      name: 'Subscription',
      description: 'Represents a subscriber\'s interest in a topic. Contains delivery queue, filter criteria, and retry/ack state.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique subscription identifier'
        },
        {
          name: 'subscriber',
          type: 'Subscriber',
          description: 'The consumer receiving messages'
        },
        {
          name: 'filter',
          type: 'MessageFilter',
          description: 'Optional criteria for message selection'
        },
        {
          name: 'queue',
          type: 'Queue<Message>',
          description: 'Durable queue of undelivered messages for this subscriber'
        },
        {
          name: 'retryCount',
          type: 'int',
          description: 'Number of delivery attempts for current batch'
        }
      ],
      methods: [
        {
          name: 'deliver(message)',
          returns: 'boolean',
          description: 'Attempts to deliver message to subscriber. Returns false on failure.'
        },
        {
          name: 'acknowledge(messageId)',
          returns: 'void',
          description: 'Marks message as delivered and removes from pending queue'
        },
        {
          name: 'matches(message)',
          returns: 'boolean',
          description: 'Checks if message passes the subscription filter'
        }
      ]
    },
    {
      name: 'Publisher',
      description: 'Entity that produces messages to topics. Publishers don\'t know about subscribers — they only publish to topics via the Broker.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique publisher identifier'
        }
      ],
      methods: [
        {
          name: 'publish(broker, topicName, message)',
          returns: 'void',
          description: 'Sends a message to the broker for distribution'
        }
      ]
    },
    {
      name: 'Subscriber',
      description: 'Consumer interface that receives messages from subscribed topics. Implementations define how messages are processed on receipt.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique subscriber identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Human-readable subscriber name'
        }
      ],
      methods: [
        {
          name: 'onMessage(message)',
          returns: 'void',
          description: 'Callback invoked when a message is delivered to this subscriber'
        },
        {
          name: 'onError(exception)',
          returns: 'void',
          description: 'Callback for delivery errors'
        }
      ]
    },
    {
      name: 'Message',
      description: 'Immutable data unit published to a topic. Contains payload, metadata, headers, and delivery tracking fields.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique message identifier'
        },
        {
          name: 'topic',
          type: 'String',
          description: 'Topic this message was published to'
        },
        {
          name: 'payload',
          type: 'Object',
          description: 'Actual message content (JSON, text, bytes)'
        },
        {
          name: 'timestamp',
          type: 'long',
          description: 'Epoch millis when the message was published'
        },
        {
          name: 'headers',
          type: 'Map<String, String>',
          description: 'Metadata key-value pairs for routing and filtering'
        }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'Pub-Sub is the Observer pattern at scale. The Broker is the subject, Subscribers are observers. When a message is published, all interested subscribers are notified. Decouples producers from consumers completely.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'Broker is a singleton — one message hub serving all publishers and subscribers. Multiple broker instances would create isolated messaging domains requiring a federation layer.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'DeliveryStrategy interface with FanOutStrategy (all subscribers), FilteredStrategy (based on filters), PriorityStrategy (by priority). Broker delegates delivery logic to the strategy.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'MessageFactory creates message instances with proper IDs, timestamps, and headers. TopicFactory creates configured topics with desired delivery strategy.'
    },
    {
      name: 'Command',
      used: false,
      explanation: 'Messages could be Command objects containing the action to execute on the subscriber. Enables queuing, scheduling, and transactional processing.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Broker routes messages. Topic manages subscribers and ordering. Subscription handles delivery, filtering, and ack. Publisher creates messages. Subscriber processes them. Each has one responsibility.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New delivery strategies implement DeliveryStrategy. New message filters implement MessageFilter. New subscriber types implement Subscriber interface. Broker and Topic remain closed.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Broker depends on Topic and Subscriber abstractions. Topic depends on Subscription interface. High-level routing logic doesn\'t depend on low-level consumer implementations.'
    },
    {
      name: 'Interface Segregation (ISP)',
      description: 'Publisher has minimal interface (publish). Subscriber has onMessage/onError. Subscription has deliver/acknowledge/matches. Each role gets only needed methods.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Message ID generation and timestamp assignment are centralized in MessageFactory. Retry logic is in Subscription — not duplicated per subscriber.'
    }
  ],
  oopConcepts: [
    {
      name: 'Composition over Inheritance',
      description: 'Broker has-a Map of Topic. Topic has-a List of Subscription. Subscription has-a Subscriber and MessageFilter. System built by composing fine-grained interfaces.',
      alternative: 'Could make Topic extend BaseTopic. Composition is chosen because topics vary in delivery strategy and durability.'
    },
    {
      name: 'Polymorphism — Subscriber Interface',
      description: 'Broker calls onMessage() on Subscriber interface without knowing concrete type. LoggingSubscriber, EmailSubscriber, DatabaseSubscriber each implement differently.',
      alternative: 'Could use callback functions. Interface-based polymorphism is chosen because subscribers often have state.'
    },
    {
      name: 'Encapsulation — Delivery Guarantees',
      description: 'Subscription encapsulates retry logic, ack tracking, and dead-letter handling. Other components have no visibility into another subscription\'s delivery state.',
      alternative: 'Could expose delivery state for monitoring. Encapsulation keeps delivery guarantees as internal concerns.'
    }
  ],
  extensibility: [
    {
      area: 'New Delivery Semantics',
      description: 'Implement a new DeliveryStrategy (e.g., ExactlyOnceStrategy with idempotency keys, OrderedStrategy with strict partitioning). Broker delegates without changing routing logic.',
      difficulty: 'Medium'
    },
    {
      area: 'Wildcard Topic Matching',
      description: 'Add hierarchical topic support (e.g., "sports.*", "sports.cricket.#"). Subscription filter matches against wildcard patterns. Existing Topic model handles routing.',
      difficulty: 'Medium'
    },
    {
      area: 'Message Persistence',
      description: 'Add MessageStore interface with InMemoryStore and DatabaseStore implementations. Messages persisted before delivery, removed after ack. Survives broker restarts.',
      difficulty: 'Medium'
    },
    {
      area: 'Backpressure / Flow Control',
      description: 'Add rate limiting per subscription. If subscriber is too slow, broker slows publishing or buffers messages. Implemented via FlowControlStrategy monitoring queue depth.',
      difficulty: 'Hard'
    }
  ],
  tradeoffs: [
    'Chose dedicated worker threads per subscriber over shared thread pool to guarantee strict FIFO ordering per subscriber.',
    'Adopted drop-and-reject backpressure policy on full queue to protect broker throughput from slow consumers.',
    'Used CopyOnWriteArrayList for subscriber lists because publish reads outnumber subscribe/unsubscribe writes 100:1.'
  ],
  solid: [
    {
      principle: 'Single Responsibility',
      details: 'Topic handles routing; SubscriberWorker manages queue & thread; Subscriber executes business logic.'
    },
    {
      principle: 'Open/Closed',
      details: 'Extensible with new Subscriber types (e.g. DatabaseSubscriber) without changing Broker.'
    }
  ]
};

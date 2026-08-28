// classDiagrams — pubsub
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Pub/Sub System (Message Broker) — Class Diagram',
  classes: [
    {
      name: 'PubSubService',
      stereotype: 'singleton',
      fields: [
        '- broker: Broker',
        '- repository: PubSubRepository',
        '- simBroker: Broker',
        '- simRepository: PubSubRepository'
      ],
      methods: [
        '+ createTopic(name): Topic',
        '+ subscribe(topic, subId, name, type, cap, delay): void',
        '+ unsubscribe(topic, subId): void',
        '+ publish(topic, payload, pubId): List<String>',
        '+ publishToSubscriber(topic, subId, payload, pubId): void',
        '+ getSubscriberMessages(topic, subId): List<Message>',
        '+ simPublish(topic, payload, pubId): List<TopicSnapshot>'
      ]
    },
    {
      name: 'Broker',
      fields: [
        '- topics: ConcurrentHashMap<String, Topic>',
        '- messageIdGen: AtomicLong'
      ],
      methods: [
        '+ createTopic(name): void',
        '+ getTopic(name): Topic',
        '+ subscribe(topic, sub, cap): void',
        '+ unsubscribe(topic, subId): void',
        '+ publish(topic, payload, pubId, headers): List<String>',
        '+ publishToSubscriber(topic, subId, payload, pubId, headers): void',
        '+ shutdown(): void'
      ]
    },
    {
      name: 'PubSubRepository',
      stereotype: 'repository',
      fields: [
        '- subscribersByKey: ConcurrentHashMap<String, Subscriber>'
      ],
      methods: [
        '+ save(topicName, subscriber): void',
        '+ find(topicName, subId): Subscriber',
        '+ exists(topicName, subId): boolean',
        '+ remove(topicName, subId): void'
      ]
    },
    {
      name: 'Topic',
      fields: [
        '- name: String',
        '- workers: CopyOnWriteArrayList<SubscriberWorker>',
        '- publishedCount: AtomicLong'
      ],
      methods: [
        '+ addSubscriber(sub, cap): void',
        '+ removeSubscriber(subId): void',
        '+ hasSubscriber(subId): boolean',
        '+ publish(message): List<String>',
        '+ publishToOne(subId, message): void'
      ]
    },
    {
      name: 'SubscriberWorker',
      stereotype: 'runnable',
      fields: [
        '- subscriber: Subscriber',
        '- queue: ArrayBlockingQueue<Message>',
        '- queueCapacity: int',
        '- deliveredCount: AtomicLong',
        '- rejectedCount: AtomicLong',
        '- workerThread: Thread'
      ],
      methods: [
        '+ enqueue(message): boolean',
        '+ enqueueOrThrow(message): void',
        '+ run(): void',
        '+ stopGracefully(): void'
      ]
    },
    {
      name: 'Subscriber',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getId(): String',
        '+ getName(): String',
        '+ consume(message): void'
      ]
    },
    {
      name: 'PrintSubscriber',
      fields: [
        'implements Subscriber',
        '- receivedMessages: CopyOnWriteArrayList<Message>'
      ],
      methods: [
        '+ consume(message): void'
      ]
    },
    {
      name: 'LoggingSubscriber',
      fields: [
        'implements Subscriber',
        '- logs: CopyOnWriteArrayList<String>'
      ],
      methods: [
        '+ consume(message): void'
      ]
    },
    {
      name: 'SlowSubscriber',
      fields: [
        'implements Subscriber',
        '- processDelayMs: long',
        '- receivedMessages: CopyOnWriteArrayList<Message>'
      ],
      methods: [
        '+ consume(message): void'
      ]
    },
    {
      name: 'Message',
      fields: [
        '- id: String',
        '- topicName: String',
        '- payload: String',
        '- publisherId: String',
        '- timestampEpoch: long'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'PubSubService',
      to: 'Broker',
      label: 'wraps'
    },
    {
      from: 'PubSubService',
      to: 'PubSubRepository',
      label: 'directs subscriber lookups to'
    },
    {
      from: 'Broker',
      to: 'Topic',
      label: 'manages'
    },
    {
      from: 'Topic',
      to: 'SubscriberWorker',
      label: 'dispatches to'
    },
    {
      from: 'SubscriberWorker',
      to: 'Subscriber',
      label: 'drains to'
    },
    {
      from: 'PrintSubscriber',
      to: 'Subscriber',
      label: 'implements',
      dashed: true
    },
    {
      from: 'LoggingSubscriber',
      to: 'Subscriber',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SlowSubscriber',
      to: 'Subscriber',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SubscriberWorker',
      to: 'Message',
      label: 'enqueues & processes'
    }
  ]
};

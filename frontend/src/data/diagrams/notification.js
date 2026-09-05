// classDiagrams — notification
export default {
  title: 'Notification System — Class Diagram',
  classes: [
    {
      name: 'NotificationService',
      stereotype: 'singleton',
      fields: [
        '- repository: NotificationRepository',
        '- channelFactory: NotificationChannelFactory',
        '- retryPolicy: RetryPolicy',
        '- pendingQueue: PriorityBlockingQueue<Notification>',
        '- idempotencyLocks: ConcurrentHashMap<String, ReentrantLock>',
        '- idempotencyIndex: ConcurrentHashMap<String, Long>',
      ],
      methods: [
        '+ send(recipientId, type, channel, templateData, idempotencyKey, priorityOverride): Notification',
        '+ setPreference(userId, type, channel, optedIn): void',
        '+ drainOnce(): Notification',
      ],
    },
    {
      name: 'Notification',
      fields: [
        '- recipientId: long',
        '- type: NotificationType',
        '- priority: Priority',
        '- channel: ChannelType',
        '- status: NotificationStatus',
        '- attemptCount: int',
        '- idempotencyKey: String',
      ],
      methods: [],
    },
    {
      name: 'NotificationStatus',
      stereotype: 'enum',
      fields: ['PENDING', 'SENT', 'RETRYING', 'SUPPRESSED', 'FAILED'],
      methods: [
        '+ canTransitionTo(next): boolean',
        '+ isTerminal(): boolean',
      ],
    },
    {
      name: 'NotificationType',
      stereotype: 'enum',
      fields: ['OTP', 'TRANSACTIONAL', 'PROMOTIONAL', 'ALERT'],
      methods: ['+ defaultPriority(): Priority'],
    },
    {
      name: 'Priority',
      stereotype: 'enum',
      fields: ['HIGH', 'MEDIUM', 'LOW'],
      methods: [],
    },
    {
      name: 'NotificationChannel',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ send(notification): void',
        '+ getType(): ChannelType',
      ],
    },
    {
      name: 'EmailChannel / SmsChannel / PushChannel / WhatsAppChannel',
      fields: ['- failureProbability: double'],
      methods: [],
    },
    {
      name: 'NotificationChannelFactory',
      fields: [],
      methods: ['+ getChannel(type): NotificationChannel'],
    },
    {
      name: 'RetryPolicy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ shouldRetry(attemptCount): boolean',
        '+ backoffFor(attemptCount): Duration',
      ],
    },
    {
      name: 'ExponentialBackoffRetryPolicy',
      fields: ['- maxAttempts: int', '- baseDelay: Duration', '- maxDelay: Duration'],
      methods: [],
    },
    {
      name: 'UserPreference',
      fields: [
        '- userId: long',
        '- type: NotificationType',
        '- channel: ChannelType',
        '- optedIn: boolean',
      ],
      methods: [],
    },
  ],
  relationships: [
    { from: 'EmailChannel / SmsChannel / PushChannel / WhatsAppChannel', to: 'NotificationChannel', label: 'implements', dashed: true },
    { from: 'ExponentialBackoffRetryPolicy', to: 'RetryPolicy', label: 'implements', dashed: true },
    { from: 'NotificationChannelFactory', to: 'NotificationChannel', label: 'creates' },
    { from: 'NotificationService', to: 'Notification', label: 'dispatches' },
    { from: 'NotificationService', to: 'NotificationChannelFactory', label: 'resolves channel via' },
    { from: 'NotificationService', to: 'RetryPolicy', label: 'consults' },
    { from: 'NotificationService', to: 'UserPreference', label: 'checks' },
    { from: 'Notification', to: 'NotificationStatus', label: 'has status' },
    { from: 'Notification', to: 'NotificationType', label: 'has type' },
    { from: 'NotificationType', to: 'Priority', label: 'has default' },
    { from: 'UserPreference', to: 'NotificationType', label: 'scoped to' },
  ],
};

// designDetails — linkedin
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// requirements/entities/designPatterns/principles/oopConcepts/extensibility rewritten from scratch
// (2026-08-30) — they previously described a fictional social-feed clone (Post, Comment,
// FeedService, NotificationService, FeedRankingStrategy) that does not exist anywhere in
// com.lld.linkedin; the tldr/tradeoffs/solid sections below were already accurate and are kept.

export default {
  title: 'LinkedIn Professional Network — Design Details',
  tldr: [
    'Professional networking platform with bidirectional connections, a PENDING/ACCEPTED/REJECTED connection lifecycle, and real-time observer alerts',
    'Weighted search ranking algorithms evaluating candidate relevance across name match, headline tokens, skill overlap, and 1st-degree network membership',
    'Observer Pattern for decoupled in-app notifications and audit logging on connection requests, messages, and job applications',
    'Fine-grained canonical pair locks (min(u1, u2) + "#" + max(u1, u2)) preventing race conditions during concurrent connection requests',
    'Direct messaging security guard enforcing 1st-degree connection status before message routing',
    'Job posting ledger with atomic applicant registration preventing duplicate applications under high concurrency'
  ],
  requirements: [
    'User registration and login with a hashed password, plus a professional profile: headline, summary, location, work experience, education, and skills',
    'Connection management — users can send, accept, or reject connection requests; only ACCEPTED connections count toward a user\'s network',
    'Direct messaging — only between users with an ACCEPTED connection; a rejected or never-sent request must not let messages through',
    'Notifications for connection requests, accepted connections, received messages, and job applications, delivered via a registered observer',
    'People search ranked by name/headline/skill relevance plus a 1st-degree-connection boost',
    'Job posting and applications — a user posts a job with required skills; other users apply once each; job search is ranked by title/skill/location/recency relevance',
    'Thread-safe concurrent access — two users racing to connect with each other (from either direction) must produce exactly one connection, never two or a deadlock'
  ],
  entities: [
    {
      name: 'LinkedInService',
      description: 'Core facade orchestrating registration/login, connections, messaging, job postings, search, and notification dispatch.',
      fields: [
        {
          name: 'repository',
          type: 'LinkedInRepository',
          description: 'User/connection/message/job storage, injected via constructor'
        },
        {
          name: 'connectionLocks',
          type: 'ConcurrentHashMap<String, ReentrantLock>',
          description: 'One lock per canonical user-pair key, guarding the whole read-validate-mutate span of sendConnectionRequest'
        },
        {
          name: 'observers, inAppObserver',
          type: 'List<NotificationObserver>, InAppNotificationObserver',
          description: 'Every registered observer is notified on dispatch; inAppObserver is also kept directly since getNotifications reads back through it'
        },
        {
          name: 'userSearchStrategy, jobSearchStrategy',
          type: 'UserSearchRankingStrategy, JobSearchRankingStrategy',
          description: 'Injected Spring beans resolving people/job search relevance scores'
        }
      ],
      methods: [
        {
          name: 'sendConnectionRequest(senderId, receiverId)',
          returns: 'Connection',
          description: 'Locks the canonical min(u1,u2)#max(u1,u2) pair key, rejects an already-PENDING or already-ACCEPTED pair, otherwise creates a new PENDING connection'
        },
        {
          name: 'sendMessage(senderId, receiverId, content)',
          returns: 'Message',
          description: 'Looks up the pair\'s active connection and rejects the message unless it is ACCEPTED'
        },
        {
          name: 'applyForJob(applicantId, jobId)',
          returns: 'boolean',
          description: 'Atomically records the applicant against the job (via the repository\'s Set#add), rejecting a duplicate application'
        }
      ]
    },
    {
      name: 'LinkedInRepository',
      description: 'In-memory user/connection/message/job store. One instance backs the live API; a second, fully independent instance backs /sim/* so the demo can never touch a real user/connection/job.',
      fields: [
        {
          name: 'usersById, usersByEmail',
          type: 'ConcurrentHashMap<String, User>, ConcurrentHashMap<String, String>',
          description: 'Users indexed by id, plus a claimed-emails index used to reject duplicate registrations'
        },
        {
          name: 'connectionsById, userConnections, activeConnectionPairs',
          type: 'ConcurrentHashMap<...>',
          description: 'Connections by id; each user\'s set of connection ids; and the canonical pair-key -> active connection id index sendConnectionRequest checks'
        },
        {
          name: 'conversations',
          type: 'ConcurrentHashMap<String, List<Message>>',
          description: 'Messages keyed by the same canonical pair-key convention as connections'
        },
        {
          name: 'jobPostings, jobApplications',
          type: 'ConcurrentHashMap<String, JobPosting>, ConcurrentHashMap<String, Set<String>>',
          description: 'Jobs by id, and each job\'s applicant-id set used for the atomic duplicate-application check'
        }
      ],
      methods: [
        {
          name: 'claimEmail(email, userId)',
          returns: 'String',
          description: 'Atomic putIfAbsent — returns the existing owner\'s id if the email is already registered, null on success'
        },
        {
          name: 'addJobApplicant(jobId, applicantId)',
          returns: 'boolean',
          description: 'Atomic Set#add against the job\'s applicant set — false means this applicant already applied'
        }
      ]
    },
    {
      name: 'User',
      description: 'A registered member: identity, hashed password, and an attached Profile.',
      fields: [
        { name: 'id, name, email, passwordHash', type: 'String', description: 'Identity and credentials; email is normalized to lowercase' },
        { name: 'profile', type: 'Profile', description: 'Created automatically alongside the user at registration' },
        { name: 'createdAt, lastLoginAt', type: 'Instant', description: 'Account creation time and most recent successful login' }
      ],
      methods: [
        { name: 'validatePassword(rawPassword)', returns: 'boolean', description: 'Compares against the stored hash (or, for this in-memory demo, the raw value directly)' }
      ]
    },
    {
      name: 'Profile',
      description: 'A user\'s professional profile: headline, summary, location, experience, education, and skills.',
      fields: [
        { name: 'headline, summary, location', type: 'String', description: 'Free-text fields, each trimmed to empty rather than null when unset' },
        { name: 'experiences, educations', type: 'List<Experience>, List<Education>', description: 'Backed by CopyOnWriteArrayList; exposed as unmodifiable views' },
        { name: 'skills', type: 'Set<Skill>', description: 'Backed by a ConcurrentHashMap key set; Skill#equals is name-based so duplicates collapse' },
        { name: 'profileViews', type: 'AtomicLong', description: 'Counter for profile-view tracking' }
      ],
      methods: []
    },
    {
      name: 'Connection',
      description: 'A directional request between two users that becomes a bidirectional link once ACCEPTED.',
      fields: [
        { name: 'requesterId, targetId', type: 'String', description: 'Who sent the request and who must respond to it' },
        { name: 'status', type: 'ConnectionStatus', description: 'PENDING -> ACCEPTED or REJECTED; only the target may accept/reject' }
      ],
      methods: [
        { name: 'getOtherUser(userId)', returns: 'String', description: 'Given one side of the connection, returns the other — used to resolve a user\'s network' }
      ]
    },
    {
      name: 'Message',
      description: 'A single direct message. Its conversationKey uses the same canonical min/max pair convention as Connection\'s lock key.',
      fields: [
        { name: 'conversationKey', type: 'String', description: 'min(senderId,receiverId) + "#" + max(...) — the same two users always land in the same conversation regardless of who sends next' },
        { name: 'content', type: 'String', description: 'Trimmed message body' }
      ],
      methods: []
    },
    {
      name: 'JobPosting',
      description: 'A job listing posted by a user, with a required-skills set and an applicant-id set.',
      fields: [
        { name: 'requiredSkills', type: 'Set<String>', description: 'Lowercased skill names — matched against an applicant\'s Profile skills by WeightedJobSearchStrategy' },
        { name: 'status', type: 'JobStatus', description: 'OPEN or CLOSED; applyForJob rejects applications once CLOSED' },
        { name: 'applicantUserIds', type: 'Set<String>', description: 'ConcurrentHashMap key set — its atomic add() is what makes duplicate-application rejection race-safe' }
      ],
      methods: []
    },
    {
      name: 'Notification',
      description: 'A single in-app notification: who it\'s for, who triggered it, what kind, and a reference id back to the connection/message/job it concerns.',
      fields: [
        { name: 'recipientId, actorId', type: 'String', description: 'Who receives it and who caused it ("SYSTEM" if actorId is null)' },
        { name: 'type', type: 'NotificationType', description: 'CONNECTION_REQUEST, CONNECTION_ACCEPTED, MESSAGE_RECEIVED, or JOB_ALERT' }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Observer Pattern',
      used: true,
      explanation: 'NotificationObserver has two implementations: InAppNotificationObserver (stores each notification per recipient — getNotifications reads back through this exact observer, not a separate copy) and LoggingNotificationObserver (audit trail to stdout). LinkedInService#dispatchNotification fans every notification out to both without either knowing the other exists.'
    },
    {
      name: 'Strategy Pattern',
      used: true,
      explanation: 'Two independent strategy families, each interface + one weighted implementation: UserSearchRankingStrategy (WeightedUserSearchStrategy — name/headline/skill/network-weighted scoring) and JobSearchRankingStrategy (WeightedJobSearchStrategy — title/skill/location/recency-weighted scoring). Both are constructor-injected Spring beans, so a second ranking formula could be swapped in without touching LinkedInService.'
    },
    {
      name: 'Repository Pattern',
      used: true,
      explanation: 'LinkedInRepository wraps the user/connection/message/job ConcurrentHashMaps behind named accessors, isolating in-memory storage from the service\'s connection-locking and notification logic — the same split every other module in this repo uses.'
    },
    {
      name: 'Singleton Pattern',
      used: true,
      explanation: 'Spring manages LinkedInService and LinkedInRepository as singletons. (A legacy manual getInstance() double-checked-locking singleton used to sit alongside the real bean — dead code nothing ever called — and has been removed.)'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'LinkedInService owns connection/messaging/job business rules and locking. LinkedInRepository owns storage. The two WeightedXSearchStrategy classes own relevance scoring. InAppNotificationObserver/LoggingNotificationObserver own notification delivery.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new ranking formula implements UserSearchRankingStrategy or JobSearchRankingStrategy and gets constructor-injected in its predecessor\'s place — LinkedInService\'s search methods never change. A new notification channel implements NotificationObserver and calls registerObserver().'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'LinkedInService depends on the UserSearchRankingStrategy/JobSearchRankingStrategy/NotificationObserver interfaces and on LinkedInRepository, never on a concrete search formula or storage detail.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any NotificationObserver implementation can be registered and invoked transparently by dispatchNotification\'s loop; any UserSearchRankingStrategy/JobSearchRankingStrategy implementation is fully substitutable wherever the interface is expected.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Profile\'s Collections',
      description: 'Profile#getExperiences/getEducations/getSkills return Collections.unmodifiableList/Set views; callers can only add through addExperience/addEducation/addSkill, so the backing CopyOnWriteArrayList/ConcurrentHashMap key set can never be mutated from outside.',
      alternative: 'Returning the live mutable collections directly would let any caller add/remove entries without going through validation, and would leak the backing thread-safe collection\'s exact type as an implementation detail.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'User has-a Profile; Profile has-a List of Experience, List of Education, Set of Skill. The domain composes fine-grained value objects rather than a deep User/Profile inheritance hierarchy.',
      alternative: 'A RichUser subclass carrying profile fields directly would tie every profile field to User\'s own lifecycle instead of letting Profile evolve (and be tested) independently.'
    },
    {
      name: 'Value-object equality — Skill',
      description: 'Skill#equals/hashCode compare by name only (case-normalized at construction), so adding "Java" twice to a Profile\'s Set<Skill> collapses to one entry regardless of which Skill instance created it.',
      alternative: 'Identity-based equality (the default Object#equals) would let the same skill name appear twice under two different Skill instances, since a Set only dedupes by equals/hashCode.'
    }
  ],
  extensibility: [
    {
      area: 'A Third Search Ranking Strategy',
      description: 'Implement UserSearchRankingStrategy or JobSearchRankingStrategy (e.g. a recency-boosted or ML-scored variant), mark it @Component, and inject it in place of the Weighted* bean — LinkedInService\'s searchUsers/searchJobs methods never change.',
      difficulty: 'Easy'
    },
    {
      area: 'Connection Degree (2nd/3rd-degree network)',
      description: 'getConnections currently returns only 1st-degree (ACCEPTED) connections. A getExtendedNetwork(userId, maxDegree) could BFS through userConnections to surface 2nd/3rd-degree suggestions, the way real LinkedIn ranks "People You May Know".',
      difficulty: 'Medium'
    },
    {
      area: 'Email/Push Notification Channels',
      description: 'Add EmailNotificationObserver/PushNotificationObserver implementing NotificationObserver and register them alongside InAppNotificationObserver/LoggingNotificationObserver — dispatchNotification\'s fan-out loop needs no change.',
      difficulty: 'Easy'
    },
    {
      area: 'Message Read Receipts',
      description: 'Message#isRead/markAsRead already exist but nothing calls markAsRead yet. A markConversationRead(userId, otherUserId) endpoint could mark every message addressed to userId in that conversation read, and getConversation could report an unread count.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Used canonical string pair locking rather than a global repository mutex to maximize connection throughput.',
    'Adopted Strategy Pattern for user and job search ranking to allow dynamic formula tweaking without modifying core services.',
    'Employed CopyOnWriteArrayList for observer lists and conversation feeds for lock-free iteration.'
  ],
  solid: [
    {
      principle: 'Single Responsibility Principle',
      details: 'Profile manages professional resume data; Connection manages relationship states; NotificationObserver handles alert delivery.'
    },
    {
      principle: 'Open/Closed Principle',
      details: 'New search ranking formulas and notification channels can be added without modifying the LinkedInService orchestrator.'
    },
    {
      principle: 'Liskov Substitution Principle',
      details: 'Any NotificationObserver implementation can be registered and invoked transparently by the event dispatcher.'
    }
  ]
};

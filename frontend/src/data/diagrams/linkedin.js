// classDiagrams — linkedin
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-30) — the previous version described a fictional social-feed
// clone (Post, Comment, FeedService, NotificationService, FeedRankingStrategy) that does not exist
// anywhere in com.lld.linkedin. The real module has no feed/post concept at all: it's a
// professional-network domain of User/Profile/Connection/Message/JobPosting, canonical pair-locked
// connection requests, direct messaging gated on 1st-degree connection status, and weighted
// user/job search ranking.

export default {
  title: 'LinkedIn Professional Network — Class Diagram',
  classes: [
    {
      name: 'LinkedInService',
      stereotype: 'singleton',
      fields: [
        '- repository: LinkedInRepository',
        '- connectionLocks: ConcurrentHashMap<String, ReentrantLock>',
        '- observers: List<NotificationObserver>',
        '- inAppObserver: InAppNotificationObserver',
        '- userSearchStrategy: UserSearchRankingStrategy',
        '- jobSearchStrategy: JobSearchRankingStrategy'
      ],
      methods: [
        '+ registerUser(name, email, password): User',
        '+ login(email, password): User',
        '+ sendConnectionRequest(senderId, receiverId): Connection',
        '+ acceptConnectionRequest(connectionId, targetUserId): Connection',
        '+ rejectConnectionRequest(connectionId, targetUserId): Connection',
        '+ sendMessage(senderId, receiverId, content): Message',
        '+ postJob(posterId, title, company, location, description, type, skills): JobPosting',
        '+ applyForJob(applicantId, jobId): boolean',
        '+ searchUsers(query, requestingUserId): List<Map>',
        '+ searchJobs(query, location, applicantId): List<Map>'
      ]
    },
    {
      name: 'LinkedInRepository',
      fields: [
        '- usersById: ConcurrentHashMap<String, User>',
        '- usersByEmail: ConcurrentHashMap<String, String>',
        '- connectionsById: ConcurrentHashMap<String, Connection>',
        '- userConnections: ConcurrentHashMap<String, Set<String>>',
        '- activeConnectionPairs: ConcurrentHashMap<String, String>',
        '- conversations: ConcurrentHashMap<String, List<Message>>',
        '- jobPostings: ConcurrentHashMap<String, JobPosting>',
        '- jobApplications: ConcurrentHashMap<String, Set<String>>'
      ],
      methods: [
        '+ claimEmail(email, userId): String',
        '+ getActiveConnectionId(pairKey): String',
        '+ addUserConnectionId(userId, connectionId): void',
        '+ addJobApplicant(jobId, applicantId): boolean',
        '+ getConversation(conversationKey): List<Message>'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- passwordHash: String',
        '- profile: Profile',
        '- createdAt: Instant',
        '- lastLoginAt: Instant'
      ],
      methods: [
        '+ validatePassword(rawPassword): boolean'
      ]
    },
    {
      name: 'Profile',
      fields: [
        '- profileId: String',
        '- userId: String',
        '- headline: String',
        '- summary: String',
        '- location: String',
        '- experiences: List<Experience>',
        '- educations: List<Education>',
        '- skills: Set<Skill>',
        '- profileViews: AtomicLong'
      ],
      methods: [
        '+ addExperience(experience): void',
        '+ addEducation(education): void',
        '+ addSkill(skill): void',
        '+ incrementProfileViews(): long'
      ]
    },
    {
      name: 'Experience',
      fields: [
        '- id: String',
        '- title: String',
        '- company: String',
        '- location: String',
        '- startDate: LocalDate',
        '- endDate: LocalDate',
        '- isCurrent: boolean',
        '- description: String'
      ],
      methods: []
    },
    {
      name: 'Education',
      fields: [
        '- id: String',
        '- school: String',
        '- degree: String',
        '- fieldOfStudy: String',
        '- startDate: LocalDate',
        '- endDate: LocalDate'
      ],
      methods: []
    },
    {
      name: 'Skill',
      fields: [
        '- id: String',
        '- name: String'
      ],
      methods: []
    },
    {
      name: 'Connection',
      fields: [
        '- id: String',
        '- requesterId: String',
        '- targetId: String',
        '- status: ConnectionStatus',
        '- createdAt: Instant',
        '- updatedAt: Instant'
      ],
      methods: [
        '+ involves(userId): boolean',
        '+ getOtherUser(userId): String'
      ]
    },
    {
      name: 'ConnectionStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'ACCEPTED',
        'REJECTED'
      ],
      methods: []
    },
    {
      name: 'Message',
      fields: [
        '- id: String',
        '- conversationKey: String',
        '- senderId: String',
        '- receiverId: String',
        '- content: String',
        '- timestamp: Instant',
        '- isRead: boolean'
      ],
      methods: [
        '+ markAsRead(): void'
      ]
    },
    {
      name: 'JobPosting',
      fields: [
        '- id: String',
        '- posterId: String',
        '- title: String',
        '- company: String',
        '- location: String',
        '- employmentType: EmploymentType',
        '- requiredSkills: Set<String>',
        '- status: JobStatus',
        '- applicantUserIds: Set<String>',
        '- postedAt: Instant'
      ],
      methods: [
        '+ addApplicant(userId): boolean',
        '+ hasApplied(userId): boolean'
      ]
    },
    {
      name: 'EmploymentType',
      stereotype: 'enum',
      fields: [
        'FULL_TIME',
        'PART_TIME',
        'CONTRACT',
        'INTERNSHIP'
      ],
      methods: []
    },
    {
      name: 'JobStatus',
      stereotype: 'enum',
      fields: [
        'OPEN',
        'CLOSED'
      ],
      methods: []
    },
    {
      name: 'Notification',
      fields: [
        '- id: String',
        '- recipientId: String',
        '- actorId: String',
        '- type: NotificationType',
        '- message: String',
        '- referenceId: String',
        '- timestamp: Instant',
        '- isRead: boolean'
      ],
      methods: [
        '+ markAsRead(): void'
      ]
    },
    {
      name: 'NotificationType',
      stereotype: 'enum',
      fields: [
        'CONNECTION_REQUEST',
        'CONNECTION_ACCEPTED',
        'MESSAGE_RECEIVED',
        'JOB_ALERT'
      ],
      methods: []
    },
    {
      name: 'NotificationObserver',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onNotification(notification): void'
      ]
    },
    {
      name: 'InAppNotificationObserver',
      fields: [
        'implements NotificationObserver',
        '- userInboxes: ConcurrentHashMap<String, List<Notification>>'
      ],
      methods: [
        '+ getNotificationsForUser(userId): List<Notification>'
      ]
    },
    {
      name: 'LoggingNotificationObserver',
      fields: [
        'implements NotificationObserver'
      ],
      methods: [
        '+ onNotification(notification): void'
      ]
    },
    {
      name: 'UserSearchRankingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateUserRelevance(target, query, requester, directConnectionIds): double'
      ]
    },
    {
      name: 'WeightedUserSearchStrategy',
      fields: [
        'implements UserSearchRankingStrategy'
      ],
      methods: [
        '+ calculateUserRelevance(target, query, requester, directConnectionIds): double'
      ]
    },
    {
      name: 'JobSearchRankingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculateJobRelevance(job, queryKeywords, location, applicant): double'
      ]
    },
    {
      name: 'WeightedJobSearchStrategy',
      fields: [
        'implements JobSearchRankingStrategy'
      ],
      methods: [
        '+ calculateJobRelevance(job, queryKeywords, location, applicant): double'
      ]
    }
  ],
  relationships: [
    { from: 'LinkedInService', to: 'LinkedInRepository', label: 'uses' },
    { from: 'LinkedInService', to: 'NotificationObserver', label: 'notifies' },
    { from: 'LinkedInService', to: 'UserSearchRankingStrategy', label: 'ranks users via' },
    { from: 'LinkedInService', to: 'JobSearchRankingStrategy', label: 'ranks jobs via' },
    { from: 'LinkedInRepository', to: 'User', label: 'stores' },
    { from: 'LinkedInRepository', to: 'Connection', label: 'stores' },
    { from: 'LinkedInRepository', to: 'Message', label: 'stores' },
    { from: 'LinkedInRepository', to: 'JobPosting', label: 'stores' },
    { from: 'User', to: 'Profile', label: 'has' },
    { from: 'Profile', to: 'Experience', label: 'contains' },
    { from: 'Profile', to: 'Education', label: 'contains' },
    { from: 'Profile', to: 'Skill', label: 'contains' },
    { from: 'Connection', to: 'ConnectionStatus', label: 'has status' },
    { from: 'JobPosting', to: 'EmploymentType', label: 'has type' },
    { from: 'JobPosting', to: 'JobStatus', label: 'has status' },
    { from: 'Notification', to: 'NotificationType', label: 'has type' },
    { from: 'InAppNotificationObserver', to: 'NotificationObserver', label: 'implements', dashed: true },
    { from: 'LoggingNotificationObserver', to: 'NotificationObserver', label: 'implements', dashed: true },
    { from: 'InAppNotificationObserver', to: 'Notification', label: 'stores per user' },
    { from: 'WeightedUserSearchStrategy', to: 'UserSearchRankingStrategy', label: 'implements', dashed: true },
    { from: 'WeightedJobSearchStrategy', to: 'JobSearchRankingStrategy', label: 'implements', dashed: true },
    { from: 'WeightedUserSearchStrategy', to: 'Skill', label: 'scores overlap with' },
    { from: 'WeightedJobSearchStrategy', to: 'JobPosting', label: 'scores relevance of' }
  ]
};

// designDetails — linkedin
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'LinkedIn Professional Network — Design Details',
  tldr: [
    'Professional networking platform with bidirectional connections, state-machine connection lifecycles, and real-time observer alerts',
    'Weighted search ranking algorithms evaluating candidate relevance across name match, headline tokens, skill overlap, and 1st/2nd/3rd network distance',
    'Observer Pattern for decoupled in-app notifications and audit logging on connection requests, messages, and job applications',
    'Fine-grained canonical pair locks (min(u1, u2) + "#" + max(u1, u2)) preventing race conditions during concurrent connection requests',
    'Direct messaging security guard enforcing 1st-degree connection status before message routing',
    'Job posting ledger with atomic applicant registration preventing duplicate applications under high concurrency'
  ],
  requirements: [
    'User profiles with professional information: experience, education, skills, recommendations, and profile photo',
    'Connection management — users can send, accept, reject connection requests with 1st/2nd/3rd degree connection visibility',
    'Feed with personalized content — posts from connections, suggested posts, sponsored content ranked by relevance and recency',
    'Post creation with text, images, and video — other users can like, comment, and share posts',
    'Notifications for connection requests, post likes, comments, shares, and profile views',
    'Search functionality — search for people, jobs, companies, and posts with filtering and sorting',
    'Messaging system — real-time chat between connected users with typing indicators and read receipts',
    'Job posting and applications — companies can post jobs, users can apply with their profile'
  ],
  entities: [
    {
      name: 'User',
      description: 'Core member entity with professional profile. Manages connections, posts, notifications, and privacy settings.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique user identifier'
        },
        {
          name: 'profile',
          type: 'Profile',
          description: 'Professional profile with experience, education, skills'
        },
        {
          name: 'connections',
          type: 'List<Connection>',
          description: 'All accepted connections with metadata'
        },
        {
          name: 'privacySettings',
          type: 'PrivacySettings',
          description: 'Profile visibility, connection request preferences'
        }
      ],
      methods: [
        {
          name: 'sendConnectionRequest(targetUser)',
          returns: 'ConnectionRequest',
          description: 'Initiates a connection request to another user'
        },
        {
          name: 'acceptRequest(request)',
          returns: 'Connection',
          description: 'Accepts a pending connection request'
        },
        {
          name: 'createPost(content)',
          returns: 'Post',
          description: 'Creates a new post on the user\'s feed'
        },
        {
          name: 'search(query, filters)',
          returns: 'SearchResults',
          description: 'Searches people, jobs, companies'
        }
      ]
    },
    {
      name: 'Profile',
      description: 'Professional profile containing work history, education, skills, achievements, and recommendations.',
      fields: [
        {
          name: 'headline',
          type: 'String',
          description: 'Professional headline (e.g., Software Engineer at Google)'
        },
        {
          name: 'experiences',
          type: 'List<Experience>',
          description: 'Work history with companies, roles, dates'
        },
        {
          name: 'education',
          type: 'List<Education>',
          description: 'Academic background with degrees and institutions'
        },
        {
          name: 'skills',
          type: 'List<Skill>',
          description: 'Professional skills with endorsements'
        },
        {
          name: 'recommendations',
          type: 'List<Recommendation>',
          description: 'Peer recommendations with text and author'
        }
      ],
      methods: [
        {
          name: 'addExperience(exp)',
          returns: 'void',
          description: 'Adds a new work experience entry'
        },
        {
          name: 'addSkill(skill)',
          returns: 'void',
          description: 'Adds a skill to the profile'
        },
        {
          name: 'endorseSkill(skill, endorser)',
          returns: 'void',
          description: 'Increments endorsement count for a skill'
        }
      ]
    },
    {
      name: 'Connection',
      description: 'Represents an accepted bidirectional connection between two users. Stores metadata like connected date and interaction strength.',
      fields: [
        {
          name: 'user1',
          type: 'User',
          description: 'First user in the connection'
        },
        {
          name: 'user2',
          type: 'User',
          description: 'Second user in the connection'
        },
        {
          name: 'connectedAt',
          type: 'LocalDateTime',
          description: 'When the connection was established'
        },
        {
          name: 'interactionScore',
          type: 'double',
          description: 'Feed ranking signal based on mutual interactions'
        }
      ],
      methods: [
        {
          name: 'getConnectionDegree(currentUser)',
          returns: 'int',
          description: 'Returns 1st, 2nd, or 3rd degree from the given user'
        }
      ]
    },
    {
      name: 'Post',
      description: 'User-generated content with text, media attachments. Supports likes, comments, and shares with engagement tracking.',
      fields: [
        {
          name: 'author',
          type: 'User',
          description: 'User who created the post'
        },
        {
          name: 'content',
          type: 'Content',
          description: 'Post body with text and optional media'
        },
        {
          name: 'likes',
          type: 'Set<User>',
          description: 'Users who liked this post'
        },
        {
          name: 'comments',
          type: 'List<Comment>',
          description: 'User comments on this post'
        },
        {
          name: 'shares',
          type: 'int',
          description: 'Number of times the post was shared'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'When the post was created'
        }
      ],
      methods: [
        {
          name: 'addLike(user)',
          returns: 'void',
          description: 'Records a like from the specified user'
        },
        {
          name: 'addComment(user, text)',
          returns: 'Comment',
          description: 'Adds a comment to this post'
        },
        {
          name: 'share(user)',
          returns: 'Post',
          description: 'Creates a reshare of this post by the given user'
        }
      ]
    },
    {
      name: 'FeedService',
      description: 'Generates personalized feed for each user. Ranks posts by relevance based on connection strength, engagement, recency, and content type.',
      fields: [
        {
          name: 'rankingStrategy',
          type: 'FeedRankingStrategy',
          description: 'Algorithm for ordering feed posts'
        }
      ],
      methods: [
        {
          name: 'getFeed(user, page, size)',
          returns: 'List<Post>',
          description: 'Returns paginated personalized feed for the user'
        },
        {
          name: 'rankPosts(posts, user)',
          returns: 'List<Post>',
          description: 'Ranks posts by relevance score for the given user'
        }
      ]
    },
    {
      name: 'NotificationService',
      description: 'Manages all user notifications. Supports in-app notifications, email digests, and push notifications with preference controls.',
      fields: [
        {
          name: 'topics',
          type: 'Map<String, List<NotificationListener>>',
          description: 'Subscribers per notification type'
        }
      ],
      methods: [
        {
          name: 'notify(event)',
          returns: 'void',
          description: 'Dispatches notification to all relevant subscribers'
        },
        {
          name: 'getNotifications(user)',
          returns: 'List<Notification>',
          description: 'Returns unread notifications for the user'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'NotificationService uses the Observer pattern. When a user likes a post or sends a connection request, all relevant parties are notified without the originating service knowing about notification logic.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'PostFactory creates different post types (TextPost, ImagePost, VideoPost, ArticlePost). Each has different rendering and interaction behaviors. Feed treats all posts uniformly through the Post interface.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'FeedService, NotificationService, and ConnectionService are singletons ensuring consistent data access and preventing duplicate notifications.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'FeedRankingStrategy interface with implementations: RelevanceRanking (engagement-based), RecencyRanking (time-based), HybridRanking (combined). FeedService delegates to the configured strategy.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'A ProfileProxy could control visibility based on connection degree. 2nd-degree connections see limited profile info, 3rd-degree see only name and headline.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'User manages identity and connections. Profile holds professional data. FeedService handles ranking. NotificationService manages alerts. Post handles engagement. Each has one job.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New post types implement Post interface. New feed strategies implement FeedRankingStrategy. New notification channels implement NotificationChannel. Core classes unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'FeedService depends on FeedRankingStrategy abstraction. NotificationService depends on NotificationChannel interface. High-level services don\'t depend on low-level implementations.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Connection degree calculation is centralized in Connection. Notification dispatch is in NotificationService. Feed ranking is in one strategy class per algorithm.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any FeedRankingStrategy can replace another without breaking FeedService. Post subtypes are fully substitutable where Post is expected.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Post Types',
      description: 'Feed renders posts polymorphically. TextPost, ImagePost, VideoPost each implement render() differently. Feed code calls render() on Post interface without knowing concrete type.',
      alternative: 'Could use a single Post class with type field and if-else rendering. Polymorphism allows adding new post types without modifying feed code.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'User has-a Profile, List of Connection, List of Post. Profile has-a List of Experience, List of Education. System composes fine-grained entities rather than deep hierarchies.',
      alternative: 'Could create RichUser extending User. Composition is chosen because profile sections vary independently and can be reused.'
    },
    {
      name: 'Encapsulation — Privacy Controls',
      description: 'User encapsulates privacy settings. Profile visibility queries go through the User\'s access control methods. External code cannot bypass privacy checks.',
      alternative: 'Could rely on frontend-only access control. Backend-enforced encapsulation provides security at the data layer.'
    }
  ],
  extensibility: [
    {
      area: 'New Post Type',
      description: 'Create a new class implementing Post interface (PollPost, EventPost). Add factory mapping. Existing feed rendering and interaction code works unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'Feed Algorithm Change',
      description: 'Implement new FeedRankingStrategy (ML-based ranking using user embeddings). Swap via configuration. No changes to FeedService or other components.',
      difficulty: 'Medium'
    },
    {
      area: 'Groups/Communities',
      description: 'Add Group entity with members, posts, and admins. GroupFeedService extends feed concepts to group context. Reuses existing Post, Comment, and Notification models.',
      difficulty: 'Medium'
    },
    {
      area: 'End-to-End Encryption for Messages',
      description: 'Implement E2E encryption in messaging service. Messages encrypted client-side. Message entity stores encrypted content. Backend never sees plaintext.',
      difficulty: 'Hard'
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

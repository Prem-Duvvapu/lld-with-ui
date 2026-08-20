// designDetails — socialNetwork
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Social Network — Design Details',
  requirements: [
    'User profiles with bio, profile picture, cover photo, and personal information with privacy controls',
    'Friend system — send, accept, reject, and cancel friend requests with bidirectional friendship',
    'Post creation — users create posts with text, images, and videos; visibility can be PUBLIC, FRIENDS_ONLY, or PRIVATE',
    'Feed generation — personalized feed showing posts from friends, liked pages, and suggested content ranked by relevance',
    'Social interactions — like, comment, and share posts with engagement notifications',
    'Friend recommendations — suggest new friends based on mutual friends, shared interests, and location',
    'Groups and pages — users can create and join groups, follow pages for topic-specific content',
    'Notification system — real-time notifications for friend requests, likes, comments, shares, and birthday reminders'
  ],
  entities: [
    {
      name: 'User',
      description: 'Core member with profile, social graph, posts, and privacy settings. Manages friendships and content visibility.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique user identifier'
        },
        {
          name: 'profile',
          type: 'Profile',
          description: 'Personal profile with bio, photos, and info'
        },
        {
          name: 'friends',
          type: 'Set<User>',
          description: 'Accepted bidirectional friendships'
        },
        {
          name: 'pendingRequests',
          type: 'List<FriendRequest>',
          description: 'Sent and received pending friend requests'
        },
        {
          name: 'privacySettings',
          type: 'PrivacySettings',
          description: 'Controls who can see posts, profile info, and friend list'
        }
      ],
      methods: [
        {
          name: 'sendFriendRequest(target)',
          returns: 'FriendRequest',
          description: 'Sends a friend request to another user'
        },
        {
          name: 'acceptRequest(request)',
          returns: 'void',
          description: 'Accepts a pending friend request'
        },
        {
          name: 'rejectRequest(request)',
          returns: 'void',
          description: 'Rejects a pending friend request'
        },
        {
          name: 'createPost(content, visibility)',
          returns: 'Post',
          description: 'Creates a new post with specified visibility'
        }
      ]
    },
    {
      name: 'Profile',
      description: 'User\'s personal and public information. Sections controlled by privacy settings for granular access control.',
      fields: [
        {
          name: 'displayName',
          type: 'String',
          description: 'Name shown to other users'
        },
        {
          name: 'bio',
          type: 'String',
          description: 'Short personal description'
        },
        {
          name: 'profilePicture',
          type: 'String',
          description: 'URL to profile photo'
        },
        {
          name: 'coverPhoto',
          type: 'String',
          description: 'URL to cover image'
        },
        {
          name: 'interests',
          type: 'List<String>',
          description: 'User interests for friend suggestions and feed ranking'
        },
        {
          name: 'location',
          type: 'String',
          description: 'Geographic location for local content'
        }
      ],
      methods: [
        {
          name: 'updateProfile(fields)',
          returns: 'void',
          description: 'Updates specified profile fields'
        },
        {
          name: 'getVisibleProfile(viewer)',
          returns: 'Profile',
          description: 'Returns profile data according to viewer relationship'
        }
      ]
    },
    {
      name: 'Post',
      description: 'User-generated content with text and media attachments. Supports likes, comments, shares, and visibility controls.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique post identifier'
        },
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
          name: 'visibility',
          type: 'Visibility',
          description: 'PUBLIC, FRIENDS_ONLY, or PRIVATE'
        },
        {
          name: 'likes',
          type: 'Set<User>',
          description: 'Users who liked this post'
        },
        {
          name: 'comments',
          type: 'List<Comment>',
          description: 'Comments on this post'
        },
        {
          name: 'sharedBy',
          type: 'List<User>',
          description: 'Users who shared this post'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'Creation time'
        }
      ],
      methods: [
        {
          name: 'like(user)',
          returns: 'void',
          description: 'Toggles like from the specified user'
        },
        {
          name: 'addComment(user, text)',
          returns: 'Comment',
          description: 'Adds a comment to the post'
        },
        {
          name: 'share(user)',
          returns: 'Post',
          description: 'Creates a reshare of the post by the given user'
        },
        {
          name: 'isVisibleTo(user)',
          returns: 'boolean',
          description: 'Checks if the given user can view this post'
        }
      ]
    },
    {
      name: 'FeedService',
      description: 'Generates personalized feeds by merging posts from friends, pages, and recommendations. Ranks by relevance score.',
      fields: [
        {
          name: 'rankingStrategy',
          type: 'FeedRankingStrategy',
          description: 'Algorithm for ordering feed content'
        }
      ],
      methods: [
        {
          name: 'getFeed(user, page, size)',
          returns: 'FeedPage',
          description: 'Returns paginated, ranked feed for the user'
        },
        {
          name: 'rankPosts(posts, user)',
          returns: 'List<Post>',
          description: 'Applies ranking algorithm to post collection'
        }
      ]
    },
    {
      name: 'FriendSuggestionService',
      description: 'Recommends potential friends using graph algorithms — mutual friends, shared interests, location proximity, and network distance.',
      fields: [
        {
          name: 'suggestionStrategies',
          type: 'List<SuggestionStrategy>',
          description: 'Multiple strategies combined for recommendations'
        }
      ],
      methods: [
        {
          name: 'getSuggestions(user, limit)',
          returns: 'List<User>',
          description: 'Returns ranked friend suggestions'
        },
        {
          name: 'getMutualFriends(user1, user2)',
          returns: 'List<User>',
          description: 'Finds common friends between two users'
        }
      ]
    },
    {
      name: 'NotificationService',
      description: 'Manages real-time and digest notifications for all social interactions: friend requests, likes, comments, shares, and birthdays.',
      fields: [
        {
          name: 'notificationQueue',
          type: 'Queue<Notification>',
          description: 'Pending notifications to be dispatched'
        }
      ],
      methods: [
        {
          name: 'notify(recipient, event)',
          returns: 'void',
          description: 'Creates and dispatches notification for an event'
        },
        {
          name: 'getNotifications(user)',
          returns: 'List<Notification>',
          description: 'Returns unread notifications for the user'
        },
        {
          name: 'markRead(notificationId)',
          returns: 'void',
          description: 'Marks a notification as read'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'NotificationService observes social events (likes, comments, friend requests). When a user interacts, all relevant participants are notified. Originating classes don\'t know about notification delivery.'
    },
    {
      name: 'Factory',
      used: true,
      explanation: 'PostFactory creates different post types (TextPost, ImagePost, VideoPost, LinkPost). Each has different rendering. Feed treats all posts uniformly through Post interface.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'FeedService, NotificationService, and FriendSuggestionService are singletons ensuring consistent ranking and preventing duplicate notifications.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'FeedRankingStrategy interface with ChronologicalRanking, EngagementRanking, MLRanking (personalized relevance). FeedService delegates to configured strategy.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'A PostProxy could enforce visibility before returning content. FRIENDS_ONLY posts check viewer relationship to author before allowing access. Separates access control from rendering.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'User manages profile and friendships. Post handles content and engagement. FeedService generates feeds. FriendSuggestionService recommends. NotificationService dispatches alerts.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New post types implement Post interface. New feed strategies implement FeedRankingStrategy. New notification channels implement NotificationChannel. Core entities unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'FeedService depends on FeedRankingStrategy abstraction. FriendSuggestionService depends on SuggestionStrategy. NotificationService depends on NotificationChannel.'
    },
    {
      name: 'Interface Segregation (ISP)',
      description: 'User has distinct methods for friendship vs content. Post has like/comment/share. No class has methods it doesn\'t use. Interfaces are fine-grained.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Friend request validation is centralized. Feed ranking is in FeedRankingStrategy. Notification dispatch is in NotificationService. Visibility checking is in Post.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Post Types in Feed',
      description: 'FeedService renders posts via Post interface. TextPost, ImagePost, VideoPost each render differently. Feed code calls render() without knowing concrete type.',
      alternative: 'Could use single Post class with type field and if-else. Polymorphism allows adding post types without modifying feed code.'
    },
    {
      name: 'Encapsulation — Privacy Controls',
      description: 'User encapsulates privacy settings. Profile provides getVisibleProfile() filtering data based on viewer relationship. External code cannot bypass privacy checks.',
      alternative: 'Could rely on frontend-only access control. Backend encapsulation provides security at data layer.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'User has-a Profile, Set of Friend, List of FriendRequest. Profile has-a List of interests. Post has-a Content, Set of likes. Social graph built by composing entities.',
      alternative: 'Could have RichUser extending BaseUser. Composition is chosen because aspects change independently.'
    }
  ],
  extensibility: [
    {
      area: 'New Post Type',
      description: 'Create Post subclass (PollPost, EventPost). Implement Post interface. Add to PostFactory. Feed and engagement models work unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'News Feed Algorithm',
      description: 'Implement new FeedRankingStrategy (graph-based or ML-based). Swap via configuration. FeedService remains unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Stories / Ephemeral Content',
      description: 'Add Story entity auto-deleting after 24 hours. Reuse Post model with TTL field and scheduled cleanup job.',
      difficulty: 'Medium'
    },
    {
      area: 'Reactions (Beyond Likes)',
      description: 'Extend Post.likes from Set<User> to Map<User, ReactionType>. ReactionType enum: LIKE, LOVE, HAHA, WOW, SAD, ANGRY.',
      difficulty: 'Easy'
    }
  ]
};

// classDiagrams — socialNetwork
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
// Grounded directly in com.lld.socialnetwork.{model,repository,service,observer,exception,controller}.

export default {
  title: 'Social Network — Class Diagram',
  classes: [
    {
      name: 'SocialController',
      stereotype: 'controller',
      fields: ['- service: SocialService'],
      methods: [
        '+ createUser(body): User',
        '+ sendFriendRequest(body): FriendRequest',
        '+ respondToRequest(requestId, accept): FriendRequest',
        '+ createPost(body): Post',
        '+ getFeed(userId): List<Post>',
        '+ likePost(postId, body): void',
        '+ addComment(postId, body): Comment'
      ]
    },
    {
      name: 'SocialService',
      stereotype: 'facade',
      fields: [
        '- repository: SocialRepository',
        '- feedNotifier: FeedNotifier',
        '- friendPairLocks: ConcurrentHashMap<String, ReentrantLock>'
      ],
      methods: [
        '+ createPost(userId, content): Post',
        '+ sendFriendRequest(fromUserId, toUserId): FriendRequest',
        '+ respondToRequest(requestId, accept): FriendRequest',
        '- doCreatePost(repo, notifier, userId, content): Post',
        '- doSendFriendRequest(repo, fromUserId, toUserId): FriendRequest',
        '- doRespondToRequest(repo, requestId, accept): FriendRequest',
        '- lockFor(userId1, userId2): ReentrantLock'
      ]
    },
    {
      name: 'FeedNotifier',
      stereotype: 'subject',
      fields: ['- observers: CopyOnWriteArrayList<FeedObserver>'],
      methods: [
        '+ registerObserver(observer): void',
        '+ removeObserver(observer): void',
        '+ publish(event): void'
      ]
    },
    {
      name: 'FeedObserver',
      stereotype: 'interface',
      fields: [],
      methods: ['+ onFeedEvent(event): void']
    },
    {
      name: 'InAppFeedObserver',
      stereotype: 'observer',
      fields: ['- events: Deque<FeedEvent>'],
      methods: ['+ onFeedEvent(event): void', '+ recentEvents(): List<FeedEvent>']
    },
    {
      name: 'LoggingFeedObserver',
      stereotype: 'observer',
      fields: [],
      methods: ['+ onFeedEvent(event): void']
    },
    {
      name: 'FeedEvent',
      stereotype: 'entity',
      fields: [
        '- postId: long', '- authorId: long', '- authorName: String',
        '- contentPreview: String', '- friendsNotified: int', '- timestamp: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'SocialRepository',
      stereotype: 'repository',
      fields: [
        '- users: ConcurrentHashMap<Long, User>',
        '- posts: ConcurrentHashMap<Long, Post>',
        '- friendRequests: ConcurrentHashMap<Long, FriendRequest>',
        '- friendships: ConcurrentHashMap<Long, Set<Long>>'
      ],
      methods: [
        '+ saveUser(name, email, bio): User',
        '+ createPost(authorId, content): Post',
        '+ sendFriendRequest(fromUserId, toUserId): FriendRequest',
        '+ acceptFriendRequest(requestId): void',
        '+ areFriends(userId1, userId2): boolean',
        '+ hasPendingRequestBetween(userId1, userId2): boolean',
        '+ getFeed(userId): List<Post>'
      ]
    },
    {
      name: 'User',
      stereotype: 'entity',
      fields: ['- id: long', '- name: String', '- email: String', '- bio: String'],
      methods: []
    },
    {
      name: 'Post',
      stereotype: 'entity',
      fields: [
        '- id: long', '- authorId: long', '- content: String', '- timestamp: LocalDateTime',
        '- likes: Set<Long>', '- comments: List<Comment>'
      ],
      methods: ['+ addLike(userId): boolean', '+ removeLike(userId): boolean', '+ addComment(comment): void']
    },
    {
      name: 'Comment',
      stereotype: 'entity',
      fields: ['- id: long', '- postId: long', '- authorId: long', '- content: String', '- timestamp: LocalDateTime'],
      methods: []
    },
    {
      name: 'FriendRequest',
      stereotype: 'entity',
      fields: ['- id: long', '- fromUserId: long', '- toUserId: long', '- status: FriendRequestStatus', '- timestamp: LocalDateTime'],
      methods: []
    },
    {
      name: 'FriendRequestStatus',
      stereotype: 'enum',
      fields: ['PENDING', 'ACCEPTED', 'REJECTED'],
      methods: []
    },
  ],
  relationships: [
    { from: 'SocialController', to: 'SocialService', label: 'delegates to' },
    { from: 'SocialService', to: 'SocialRepository', label: 'uses' },
    { from: 'SocialService', to: 'FeedNotifier', label: 'publishes via' },
    { from: 'FeedNotifier', to: 'FeedObserver', label: 'notifies' },
    { from: 'FeedNotifier', to: 'FeedEvent', label: 'publishes' },
    { from: 'InAppFeedObserver', to: 'FeedObserver', label: 'implements', dashed: true },
    { from: 'LoggingFeedObserver', to: 'FeedObserver', label: 'implements', dashed: true },
    { from: 'InAppFeedObserver', to: 'FeedEvent', label: 'stores' },
    { from: 'SocialRepository', to: 'User', label: 'stores' },
    { from: 'SocialRepository', to: 'Post', label: 'stores' },
    { from: 'SocialRepository', to: 'FriendRequest', label: 'stores' },
    { from: 'User', to: 'User', label: 'friends with (adjacency)' },
    { from: 'User', to: 'Post', label: 'authors' },
    { from: 'Post', to: 'Comment', label: 'has' },
    { from: 'FriendRequest', to: 'FriendRequestStatus', label: 'has status' },
    { from: 'FriendRequest', to: 'User', label: 'from / to' },
  ]
};

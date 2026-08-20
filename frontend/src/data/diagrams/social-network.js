// classDiagrams — socialNetwork
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Social Network — Class Diagram',
  classes: [
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- friends: List<User>',
        '- posts: List<Post>',
        '- pendingRequests: List<FriendRequest>'
      ],
      methods: [
        '+ sendFriendRequest(to): void',
        '+ acceptRequest(from): void',
        '+ createPost(content): Post',
        '+ getNewsFeed(): List<Post>'
      ]
    },
    {
      name: 'Post',
      fields: [
        '- id: String',
        '- author: User',
        '- content: String',
        '- likes: Set<String>',
        '- comments: List<Comment>',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ like(userId): void',
        '+ addComment(comment): void'
      ]
    },
    {
      name: 'FriendRequest',
      fields: [
        '- from: User',
        '- to: User',
        '- status: FriendRequestStatus',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ accept(): void',
        '+ reject(): void'
      ]
    },
    {
      name: 'NewsFeed',
      fields: [
        '- user: User',
        '- posts: List<Post>'
      ],
      methods: [
        '+ generate(user): NewsFeed',
        '+ refresh(): void'
      ]
    },
    {
      name: 'Notification',
      fields: [
        '- id: String',
        '- user: User',
        '- type: String (LIKE/COMMENT/REQUEST)',
        '- message: String',
        '- isRead: boolean'
      ],
      methods: [
        '+ markRead(): void'
      ]
    },
    {
      name: 'FriendRequestStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'ACCEPTED',
        'REJECTED'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'User',
      to: 'User',
      label: 'friends with'
    },
    {
      from: 'User',
      to: 'Post',
      label: 'creates'
    },
    {
      from: 'User',
      to: 'FriendRequest',
      label: 'sends/receives'
    },
    {
      from: 'FriendRequest',
      to: 'FriendRequestStatus',
      label: 'has status'
    },
    {
      from: 'User',
      to: 'NewsFeed',
      label: 'has'
    },
    {
      from: 'User',
      to: 'Notification',
      label: 'receives'
    }
  ]
};

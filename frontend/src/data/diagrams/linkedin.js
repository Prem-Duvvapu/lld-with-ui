// classDiagrams — linkedin
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'LinkedIn — Class Diagram',
  classes: [
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- headline: String',
        '- connections: List<Connection>',
        '- posts: List<Post>'
      ],
      methods: [
        '+ sendConnectionRequest(to): void',
        '+ acceptConnection(from): void',
        '+ createPost(content): Post',
        '+ getFeed(): List<Post>'
      ]
    },
    {
      name: 'Profile',
      fields: [
        '- user: User',
        '- summary: String',
        '- experience: List<Experience>',
        '- education: List<Education>',
        '- skills: List<String>'
      ],
      methods: [
        '+ addExperience(exp): void',
        '+ addSkill(skill): void'
      ]
    },
    {
      name: 'Connection',
      fields: [
        '- fromUser: User',
        '- toUser: User',
        '- status: String',
        '- createdAt: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'Post',
      fields: [
        '- id: String',
        '- author: User',
        '- content: String',
        '- likes: int',
        '- comments: List<Comment>',
        '- createdAt: LocalDateTime'
      ],
      methods: [
        '+ like(): void',
        '+ addComment(comment): void'
      ]
    },
    {
      name: 'Notification',
      fields: [
        '- id: String',
        '- user: User',
        '- type: String',
        '- message: String',
        '- isRead: boolean'
      ],
      methods: [
        '+ markRead(): void'
      ]
    },
    {
      name: 'FeedService',
      fields: [
        '- users: Map<String, User>'
      ],
      methods: [
        '+ generateFeed(user): List<Post>',
        '+ getConnectionUpdates(user): List<Post>'
      ]
    }
  ],
  relationships: [
    {
      from: 'User',
      to: 'Profile',
      label: 'has'
    },
    {
      from: 'User',
      to: 'Connection',
      label: 'has many'
    },
    {
      from: 'User',
      to: 'Post',
      label: 'creates'
    },
    {
      from: 'Connection',
      to: 'User',
      label: 'links (from/to)'
    },
    {
      from: 'FeedService',
      to: 'User',
      label: 'reads'
    },
    {
      from: 'User',
      to: 'Notification',
      label: 'receives'
    }
  ]
};

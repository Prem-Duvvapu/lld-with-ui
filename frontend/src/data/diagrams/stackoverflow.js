// classDiagrams — stackoverflow
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Stack Overflow — Class Diagram',
  classes: [
    {
      name: 'StackOverflowService',
      methods: [
        '+ postQuestion(user, title, body, tags): Question',
        '+ postAnswer(user, questionId, body): Answer',
        '+ vote(entity, user, voteType): void',
        '+ acceptAnswer(questionId, answerId): void'
      ]
    },
    {
      name: 'Question',
      fields: [
        '- id: String',
        '- title: String',
        '- body: String',
        '- author: User',
        '- tags: List<Tag>',
        '- answers: List<Answer>',
        '- acceptedAnswerId: String'
      ],
      methods: [
        '+ addVote(vote): void',
        '+ getScore(): int'
      ]
    },
    {
      name: 'Answer',
      fields: [
        '- id: String',
        '- body: String',
        '- author: User',
        '- votes: List<Vote>'
      ],
      methods: [
        '+ addVote(vote): void'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- reputation: int'
      ],
      methods: [
        '+ updateReputation(delta): void'
      ]
    },
    {
      name: 'Vote',
      fields: [
        '- type: VoteType',
        '- user: User'
      ],
      methods: []
    },
    {
      name: 'VoteType',
      stereotype: 'enum',
      fields: [
        'UPVOTE',
        'DOWNVOTE'
      ],
      methods: []
    },
    {
      name: 'Tag',
      fields: [
        '- name: String'
      ],
      methods: []
    },
    {
      name: 'ReputationStrategy',
      stereotype: 'interface',
      methods: [
        '+ calculateReputation(user, action): int'
      ]
    },
    {
      name: 'QuestionReputationStrategy',
      fields: [
        '- implements ReputationStrategy'
      ],
      methods: [
        '+ calculateReputation(user, action): int'
      ]
    },
    {
      name: 'AnswerReputationStrategy',
      fields: [
        '- implements ReputationStrategy'
      ],
      methods: [
        '+ calculateReputation(user, action): int'
      ]
    }
  ],
  relationships: [
    {
      from: 'StackOverflowService',
      to: 'Question',
      label: 'manages'
    },
    {
      from: 'StackOverflowService',
      to: 'Answer',
      label: 'manages'
    },
    {
      from: 'Question',
      to: 'Answer',
      label: 'has'
    },
    {
      from: 'Question',
      to: 'Tag',
      label: 'tagged with'
    },
    {
      from: 'Question',
      to: 'Vote',
      label: 'has'
    },
    {
      from: 'Answer',
      to: 'Vote',
      label: 'has'
    },
    {
      from: 'StackOverflowService',
      to: 'ReputationStrategy',
      label: 'uses'
    },
    {
      from: 'QuestionReputationStrategy',
      to: 'ReputationStrategy',
      label: 'implements',
      dashed: true
    },
    {
      from: 'AnswerReputationStrategy',
      to: 'ReputationStrategy',
      label: 'implements',
      dashed: true
    }
  ]
};

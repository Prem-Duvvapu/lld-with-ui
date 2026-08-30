// classDiagrams — stackoverflow
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Stack Overflow — Class Diagram',
  classes: [
    {
      name: 'StackOverflowService',
      stereotype: 'singleton',
      fields: [
        '- repository: StackOverflowRepository',
        '- votingService: VotingService',
      ],
      methods: [
        '+ postQuestion(title, body, authorId, tags): Question',
        '+ postAnswer(questionId, body, authorId): Answer',
        '+ addComment(targetType, targetId, body, authorId): Comment',
        '+ voteQuestion(id, userId, voteTypeRaw): Question',
        '+ voteAnswer(id, userId, voteTypeRaw): Answer',
        '+ closeQuestion(id, userId): Question',
      ]
    },
    {
      name: 'VotingService',
      stereotype: 'singleton',
      fields: [
        '- repository: StackOverflowRepository',
        '- ACCEPTED_ANSWER_BONUS: int = 15'
      ],
      methods: [
        '+ voteQuestion(questionId, voterId, voteType): Question',
        '+ voteAnswer(answerId, voterId, voteType): Answer',
        '- applyVote(post: Votable, targetType, voterId, voteType): void',
        '+ acceptAnswer(questionId, answerId, requesterId): Question',
        '+ closeQuestion(questionId, requesterId): Question'
      ]
    },
    {
      name: 'StackOverflowRepository',
      fields: [
        '- questions: ConcurrentHashMap<String, Question>',
        '- answers: ConcurrentHashMap<String, Answer>',
        '- users: ConcurrentHashMap<String, User>',
        '- postLocks: ConcurrentHashMap<String, ReentrantLock>',
        '- userLocks: ConcurrentHashMap<String, ReentrantLock>'
      ],
      methods: [
        '+ postLock(postId): ReentrantLock',
        '+ userLock(userId): ReentrantLock',
        '+ saveQuestion(q) / saveAnswer(qId, a) / saveUser(u): void',
        '+ seed(): void'
      ]
    },
    {
      name: 'Votable',
      stereotype: 'interface',
      methods: [
        '+ getId(): String',
        '+ getAuthorId(): String',
        '+ getScore(): int',
        '+ setScore(score): void',
        '+ getVotes(): Map<String, VoteType>'
      ]
    },
    {
      name: 'Question',
      fields: [
        '- id: String',
        '- title: String, body: String',
        '- authorId: String',
        '- tags: List<String>',
        '- answers: List<Answer>',
        '- votes: Map<String, VoteType>',
        '- score: int',
        '- status: QuestionStatus'
      ],
      methods: [
        '+ incrementView(): void',
        '+ addAnswer(a) / addComment(c): void'
      ]
    },
    {
      name: 'Answer',
      fields: [
        '- id: String',
        '- body: String',
        '- authorId: String, questionId: String',
        '- accepted: boolean',
        '- votes: Map<String, VoteType>',
        '- score: int'
      ],
      methods: [
        '+ addComment(c): void'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- username: String, email: String',
        '- reputation: int'
      ],
      methods: []
    },
    {
      name: 'VoteType',
      stereotype: 'enum',
      fields: ['UPVOTE', 'DOWNVOTE']
    },
    {
      name: 'QuestionStatus',
      stereotype: 'enum',
      fields: ['OPEN', 'ANSWERED', 'CLOSED']
    },
    {
      name: 'ReputationStrategy',
      stereotype: 'interface',
      methods: ['+ deltaForVote(voteType: VoteType): int']
    },
    {
      name: 'QuestionReputationStrategy',
      methods: ['+ deltaForVote(voteType): int  // UPVOTE +5, DOWNVOTE -2']
    },
    {
      name: 'AnswerReputationStrategy',
      methods: ['+ deltaForVote(voteType): int  // UPVOTE +10, DOWNVOTE -2']
    },
    {
      name: 'ReputationStrategyFactory',
      stereotype: 'singleton',
      methods: ['+ forTarget(targetType: VoteTargetType): ReputationStrategy']
    }
  ],
  relationships: [
    { from: 'StackOverflowService', to: 'StackOverflowRepository', label: 'reads / writes' },
    { from: 'StackOverflowService', to: 'VotingService', label: 'delegates voting to' },
    { from: 'VotingService', to: 'StackOverflowRepository', label: 'locks via' },
    { from: 'VotingService', to: 'ReputationStrategyFactory', label: 'resolves strategy via' },
    { from: 'ReputationStrategyFactory', to: 'ReputationStrategy', label: 'creates' },
    { from: 'QuestionReputationStrategy', to: 'ReputationStrategy', label: 'implements', dashed: true },
    { from: 'AnswerReputationStrategy', to: 'ReputationStrategy', label: 'implements', dashed: true },
    { from: 'Question', to: 'Votable', label: 'implements', dashed: true },
    { from: 'Answer', to: 'Votable', label: 'implements', dashed: true },
    { from: 'Question', to: 'VoteType', label: 'votes have type' },
    { from: 'Answer', to: 'VoteType', label: 'votes have type' },
    { from: 'Question', to: 'QuestionStatus', label: 'has status' },
    { from: 'StackOverflowRepository', to: 'Question', label: 'stores' },
    { from: 'StackOverflowRepository', to: 'Answer', label: 'stores' },
    { from: 'StackOverflowRepository', to: 'User', label: 'stores' },
    { from: 'Question', to: 'Answer', label: 'has many' },
    { from: 'Answer', to: 'User', label: 'authored by' },
    { from: 'Question', to: 'User', label: 'authored by' }
  ]
};

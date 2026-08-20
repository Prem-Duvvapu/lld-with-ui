// designDetails — stackoverflow
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Stack Overflow — Design Details',
  tldr: [
    'Q&A platform with questions, answers, comments, voting, and reputation system',
    'Observer Pattern for notifying question authors on new answers/comments',
    'Thread-safe voting and accept-answer operations'
  ],
  requirements: [
    'Post questions with tags and body text',
    'Post answers to questions',
    'Upvote / Downvote questions and answers',
    'Accept correct answer (only by question author)',
    'Search questions by tag or keyword'
  ],
  entities: [
    {
      name: 'StackOverflowService',
      description: 'Main service managing Q&A operations.',
      fields: [],
      methods: [
        {
          name: 'askQuestion(...)',
          returns: 'Question',
          description: 'Creates new question'
        },
        {
          name: 'answerQuestion(...)',
          returns: 'Answer',
          description: 'Adds answer to question'
        },
        {
          name: 'vote(...)',
          returns: 'void',
          description: 'Updates vote count on question/answer'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer Pattern',
      used: true,
      explanation: 'Notifies users on answer posts or votes.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility',
      description: 'Separate Question, Answer, Comment, and User entities.'
    }
  ],
  oopConcepts: [
    {
      name: 'Inheritance / Polymorphism',
      description: 'Votable interface implemented by Question and Answer.'
    }
  ],
  extensibility: [
    {
      area: 'Reputation System',
      description: 'Add user reputation score calculation rules.',
      difficulty: 'Easy'
    }
  ],
  tradeoffs: [
    'In-memory ConcurrentHashMap for questions and answers ensures high read throughput.'
  ]
};

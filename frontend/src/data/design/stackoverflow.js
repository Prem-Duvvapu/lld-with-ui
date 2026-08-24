// designDetails — stackoverflow
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Stack Overflow — Design Details',
  requirements: [
    'Post a question with a title, body and one or more tags (every tag must already be registered — an unknown tag is rejected, not silently created)',
    'Post an answer to any OPEN or ANSWERED question; a CLOSED question refuses new answers',
    'Upvote or downvote a question or an answer, but never your own — self-votes are rejected outright',
    'Changing an existing vote (upvote to downvote or back) applies only the net delta once; repeating the identical vote is a no-op',
    'The question author accepts exactly one answer, awarding a one-time reputation bonus; accepting a different answer later moves the flag without re-scoring the first',
    'Only the question author may accept an answer or close the question, and closing an already-closed question is rejected',
    'Search questions by keyword, tag or author, newest first'
  ],
  entities: [
    {
      name: 'StackOverflowService',
      description: 'Facade for the live module: owns question/answer/comment authoring, tag validation and reputation rewards for those actions; delegates every vote, accept and close to VotingService. Also hosts the isolated /sim/* sandbox (its own repository + VotingService instance).',
      fields: [
        { name: 'repository', type: 'StackOverflowRepository', description: 'Live in-memory store' },
        { name: 'votingService', type: 'VotingService', description: 'Owns the deterministic lock ordering for compound mutations' },
        { name: 'simRepository / simVotingService', type: 'StackOverflowRepository / VotingService', description: 'A second, independent instance backing /api/stackoverflow/sim/* so the demo can never touch live data' }
      ],
      methods: [
        { name: 'postQuestion(title, body, authorId, tags)', returns: 'Question', description: 'Validates every tag exists, creates the question, rewards the author +5 reputation under the author\'s user lock' },
        { name: 'postAnswer(questionId, body, authorId)', returns: 'Answer', description: 'Appends the answer to the question\'s list under the question\'s post lock (the same lock VotingService.acceptAnswer iterates that list under), rejects a CLOSED question, rewards the author +10' },
        { name: 'addComment(targetType, targetId, body, authorId)', returns: 'Comment', description: 'Appends under the target post\'s lock, rewards the author +2' },
        { name: 'voteQuestion/voteAnswer/acceptAnswer/closeQuestion(...)', returns: 'Question / Answer', description: 'Parses the vote-type string into the typed enum, then delegates to VotingService' }
      ]
    },
    {
      name: 'VotingService',
      description: 'Owns every compound mutation that touches both a post\'s score and its author\'s reputation. The one place in the module with more than one lock in play.',
      fields: [
        { name: 'ACCEPTED_ANSWER_BONUS', type: 'int = 15', description: 'One-time reputation award for having an answer accepted — deliberately not part of ReputationStrategy; see designPatterns below for why folding it in there was the bug' }
      ],
      methods: [
        { name: 'voteQuestion/voteAnswer(id, voterId, voteType)', returns: 'Question / Answer', description: 'Generic applyVote(Votable, ...) under the post\'s lock: rejects a self-vote, is a no-op on a repeated identical vote, applies only the net score/reputation delta on a changed vote' },
        { name: 'acceptAnswer(questionId, answerId, requesterId)', returns: 'Question', description: 'Holds the question\'s lock for the whole call; unsets any previous accepted answer one answer-lock at a time, sets the target, awards the bonus under the author\'s user lock, moves the question to ANSWERED' },
        { name: 'closeQuestion(questionId, requesterId)', returns: 'Question', description: 'Author-only; OPEN/ANSWERED -> CLOSED, rejects a second close' }
      ]
    },
    {
      name: 'Question / Answer',
      description: 'Both implement Votable (getId/getAuthorId/getScore/setScore/getVotes) so VotingService applies the vote/reputation math once, generically, instead of duplicating it per type. votes is a Map<userId, VoteType> — the source of both idempotency and vote-change detection.',
      fields: [
        { name: 'votes', type: 'Map<String, VoteType>', description: 'Remembers each voter\'s current vote so a repeat or change is handled precisely' },
        { name: 'status', type: 'QuestionStatus (Question only)', description: 'OPEN -> ANSWERED on accept, OPEN/ANSWERED -> CLOSED on close' }
      ],
      methods: []
    },
    {
      name: 'StackOverflowRepository',
      description: 'ConcurrentHashMap-backed store, plus the two lock maps VotingService reads from. Question and Answer ids are prefixed Q-/A- and never collide, so they safely share one postLock map.',
      fields: [
        { name: 'postLocks / userLocks', type: 'Map<String, ReentrantLock>', description: 'One lock per post id and per user id, created lazily via computeIfAbsent' }
      ],
      methods: [
        { name: 'postLock(id) / userLock(id)', returns: 'ReentrantLock', description: 'Interned per-entity locks — the same id always returns the same lock instance' },
        { name: 'seed()', returns: 'void', description: 'Wipes and reseeds this store; called by StackOverflowInitializer at boot and independently by the sim sandbox\'s reset' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory',
      used: true,
      explanation: 'ReputationStrategy (QuestionReputationStrategy: +5/-2, AnswerReputationStrategy: +10/-2) is resolved by ReputationStrategyFactory.forTarget(VoteTargetType), never an inline switch at the call site. The first draft of this module had a third strategy, AcceptedAnswerReputationStrategy, that returned a flat +25 for every vote on an accepted answer regardless of direction — folding a one-time event into a per-vote strategy. It was deleted; the accepted-answer bonus is now a plain constant applied exactly once, in VotingService.acceptAnswer, not through the strategy interface at all.'
    },
    {
      name: 'State machine (QuestionStatus)',
      used: true,
      explanation: 'OPEN -> ANSWERED on accept, OPEN/ANSWERED -> CLOSED on close, and CLOSED rejects both new answers and a second close. Enforced in VotingService/StackOverflowService, not scattered ad-hoc checks.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'StackOverflowController only translates HTTP; StackOverflowService is the single entry point the controller calls, delegating the locking-heavy operations to VotingService.'
    }
  ],
  principles: [
    { name: 'Single Responsibility', description: 'StackOverflowService owns authoring and reputation rewards for authoring; VotingService owns everything that touches a vote, an accept or a close. Splitting them out of one god-service is what makes the lock-ordering javadoc on VotingService a single, checkable place.' },
    { name: 'Open/Closed', description: 'A third votable post type would only need to implement Votable and register a ReputationStrategy in the factory — VotingService.applyVote is already generic over Votable.' }
  ],
  oopConcepts: [
    { name: 'Interface + generics', description: 'Votable lets applyVote(Votable post, ...) run the identical vote/reputation logic for both Question and Answer without an if/instanceof branch.' },
    { name: 'Polymorphism', description: 'ReputationStrategy.deltaForVote(VoteType) — the factory hands back a QuestionReputationStrategy or AnswerReputationStrategy and the caller never knows which.' }
  ],
  extensibility: [
    { area: 'Bounties', description: 'A user spends reputation to add a bounty to their own question, paid out to whichever answer they accept within a window — fits as a new field on Question plus a check in acceptAnswer.', difficulty: 'Medium' },
    { area: 'Reputation caps and daily vote limits', description: 'Real Stack Overflow caps how much reputation one answer\'s votes can earn per day and limits how many downvotes a user can cast per day — both are per-user counters that would sit next to the existing userLock.', difficulty: 'Medium' },
    { area: 'Duplicate-question detection', description: 'A "possible duplicate" suggestion when posting, using a text-similarity check against existing titles.', difficulty: 'Hard' }
  ],
  tradeoffs: [
    'Chose a fixed lock tier order — Question, then Answer, then User, never acquired out of order — over a single module-wide lock. A single lock would also be trivially deadlock-free but would serialize every vote in the system through one mutex; the tiered per-entity locks let votes on unrelated posts run fully in parallel, at the cost of the ordering discipline having to be documented and honored by every method (VotingService\'s class javadoc is that documentation).',
    'The accepted-answer bonus is a plain one-time constant, not a third ReputationStrategy, specifically because the original design bundled it into the strategy interface and it silently re-fired on every subsequent vote on the accepted answer, including downvotes. Separating "what a vote is worth" from "what accepting is worth" removed an entire class of double-award bugs at the cost of one more special case in VotingService.acceptAnswer.',
    'votes is stored as a live Map<userId, VoteType> on the post itself rather than an append-only Vote log, so a changed vote is an O(1) lookup instead of a scan — the cost is that per-voter history (when did they vote, did they ever change it) is not retained.'
  ],
  summary: 'A Q&A platform — questions, answers, comments, tags, voting and reputation — built around one generic voting/reputation pipeline (Votable + ReputationStrategy + a deterministic question-then-answer-then-user lock order) so the same code proves correct for both questions and answers, and concurrent votes on the same post can neither deadlock nor lose an update.',
  highlights: [
    'Votable lets one applyVote() implementation run for both Question and Answer — no type-specific vote code path exists',
    'Deterministic Question -> Answer -> User lock tier order, proven by a repeated-round test (300 rounds of two threads racing to accept different answers) and a 60-voter concurrent-upvote test that would fail with the lock removed',
    'The accepted-answer bonus bug — a strategy that re-fired +25 on every vote, including downvotes, because it conflated a one-time event with a per-vote calculation — found and fixed by separating "vote strategy" from "one-time bonus constant"',
    'Idempotent voting: repeating an identical vote is a no-op, changing a vote applies only the net delta, verified with exact numbers in VotingServiceTest'
  ]
};

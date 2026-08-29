// Sequence diagram content for stackoverflow.
// Grounded directly in StackOverflowService, VotingService (atomic reputation + vote toggling),
// and Answer acceptance / Bounty allocation.
export default {
  title: 'Stack Overflow — Atomic Voting, Reputation Adjustment & Answer Acceptance',
  description:
    'How StackOverflowService manages content voting and author reputation. VotingService ensures that duplicate votes from the same user are rejected or toggled, updates vote counts atomically, and applies reputation points (+10 for question/answer author on upvote) under fine-grained post locks.',
  flows: [
    {
      id: 'vote-and-reputation-flow',
      label: 'Upvoting an answer updates vote count & grants +10 author reputation',
      description:
        'User Alice upvotes Bob\'s answer to a Spring Boot question. VotingService locks the answer, checks Alice hasn\'t previously voted, registers the UPVOTE, increments the answer score, and credits Bob\'s profile with +10 reputation.',
      participants: [
        { id: 'voter', name: 'Voter\n(Alice)', kind: 'actor' },
        { id: 'controller', name: 'StackOverflow\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'StackOverflow\nService', kind: 'component', stereotype: 'facade' },
        { id: 'voteService', name: 'VotingService', kind: 'component' },
        { id: 'postLock', name: 'postLock("ANS-42")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'StackOverflow\nRepository', kind: 'store' },
        { id: 'userRepo', name: 'StackOverflowRepository', kind: 'store' },
      ],
      steps: [
        { from: 'voter', to: 'controller', text: 'POST /api/stackoverflow/answers/ANS-42/vote {userId: "alice", type: "UPVOTE"}' },
        { from: 'controller', to: 'service', text: 'voteAnswer("ANS-42", "alice", UPVOTE)', activate: 'service' },
        { from: 'service', to: 'voteService', text: 'castVote("ANS-42", "alice", UPVOTE)', activate: 'voteService' },
        { from: 'voteService', to: 'postLock', text: 'lock.lock() — ACQUIRED', activate: 'postLock' },
        { from: 'voteService', to: 'repo', text: 'getAnswer("ANS-42") ; getVote("ANS-42", "alice")' },
        { from: 'repo', to: 'voteService', text: 'Answer {id: "ANS-42", author: "bob", score: 5}, existingVote = null', type: 'return' },
        { from: 'voteService', to: 'repo', text: 'saveVote(Vote {target: "ANS-42", voter: "alice", UPVOTE})' },
        { from: 'voteService', to: 'repo', text: 'updateScore("ANS-42", score = 5 + 1 = 6)' },
        { from: 'voteService', to: 'userRepo', text: 'incrementReputation("bob", +10 points)' },
        { from: 'voteService', to: 'postLock', text: 'lock.unlock()', deactivate: 'postLock' },
        { from: 'voteService', to: 'service', text: 'VoteResult {newScore: 6, userVote: UPVOTE}', type: 'return', deactivate: 'voteService' },
        { from: 'service', to: 'controller', text: 'return VoteResult', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'voter', text: '200 OK {score: 6, status: "UPVOTED", authorReputationDelta: +10}', type: 'return' },
      ],
    },
  ],
};

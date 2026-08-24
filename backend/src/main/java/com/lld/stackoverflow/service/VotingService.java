package com.lld.stackoverflow.service;

import com.lld.stackoverflow.exception.*;
import com.lld.stackoverflow.model.*;
import com.lld.stackoverflow.repository.StackOverflowRepository;
import com.lld.stackoverflow.strategy.ReputationStrategy;
import com.lld.stackoverflow.strategy.ReputationStrategyFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.locks.ReentrantLock;

/**
 * Owns every compound mutation that touches both a post's score and its
 * author's reputation: voting, accepting an answer, and closing a question.
 *
 * <h2>Lock ordering</h2>
 * Every method acquires locks in the fixed tier order
 * <strong>Question &le; Answer &le; User</strong>, obtained from
 * {@link StackOverflowRepository#postLock(String)} (Question and Answer ids
 * never collide — {@code Q-}/{@code A-} prefixes — so they safely share one
 * lock map) and {@link StackOverflowRepository#userLock(String)}. No method
 * ever acquires a lower tier while already holding a higher one, so a
 * consistent partial order is maintained across every call site in this
 * class and a circular wait (deadlock) cannot form, regardless of how many
 * threads interleave or which posts/users they target:
 *
 * <ul>
 *   <li>{@link #voteQuestion} / {@link #voteAnswer}: post lock, then (if the
 *       vote actually changes something) the author's user lock.</li>
 *   <li>{@link #acceptAnswer}: the question's lock, held for the whole call;
 *       nested inside it, each affected answer's lock is taken and released
 *       one at a time (never two answer locks held simultaneously); the
 *       accepted answer's author's user lock is taken last.</li>
 *   <li>{@link #closeQuestion}: the question's lock only.</li>
 * </ul>
 *
 * <p>Every read of mutable post/user state that a decision depends on
 * happens <em>after</em> the relevant lock is held and is re-checked there
 * (never trusted from before the lock was acquired) — the classic
 * check-then-act race this repo keeps producing.
 */
@Service
public class VotingService {

    /** One-time reputation award for having an answer accepted — not a per-vote strategy.
     * See {@link ReputationStrategy} javadoc for why this used to be a bug. */
    static final int ACCEPTED_ANSWER_BONUS = 15;
    static final int MIN_REPUTATION = 1;

    private final StackOverflowRepository repository;

    public VotingService(StackOverflowRepository repository) {
        this.repository = repository;
    }

    public Question voteQuestion(String questionId, String voterId, VoteType voteType) {
        Question q = repository.getQuestion(questionId);
        if (q == null) {
            throw new QuestionNotFoundException("Question not found: " + questionId);
        }
        applyVote(q, VoteTargetType.QUESTION, voterId, voteType);
        return q;
    }

    public Answer voteAnswer(String answerId, String voterId, VoteType voteType) {
        Answer a = repository.getAnswer(answerId);
        if (a == null) {
            throw new AnswerNotFoundException("Answer not found: " + answerId);
        }
        applyVote(a, VoteTargetType.ANSWER, voterId, voteType);
        return a;
    }

    /**
     * Generic over {@link Votable} so a question vote and an answer vote share one
     * implementation of the idempotent-change / self-vote / score / reputation math.
     */
    private void applyVote(Votable post, VoteTargetType targetType, String voterId, VoteType voteType) {
        User voter = repository.getUser(voterId);
        if (voter == null) {
            throw new UserNotFoundException("User not found: " + voterId);
        }

        ReentrantLock postLock = repository.postLock(post.getId());
        postLock.lock();
        try {
            // Re-checked inside the lock: the author never changes post-creation, but
            // every decision this method makes is read fresh under the lock on principle.
            if (post.getAuthorId().equals(voterId)) {
                throw new SelfVoteException(
                        "User " + voterId + " cannot vote on their own " + targetType.name().toLowerCase());
            }

            VoteType previous = post.getVotes().get(voterId);
            if (previous == voteType) {
                return; // idempotent: repeating the identical vote changes nothing
            }

            post.setScore(post.getScore() - scoreDeltaFor(previous) + scoreDeltaFor(voteType));
            post.getVotes().put(voterId, voteType);

            ReputationStrategy strategy = ReputationStrategyFactory.forTarget(targetType);
            int repDelta = repDeltaFor(strategy, voteType) - repDeltaFor(strategy, previous);

            ReentrantLock authorLock = repository.userLock(post.getAuthorId());
            authorLock.lock();
            try {
                User author = repository.getUser(post.getAuthorId());
                if (author != null) {
                    author.setReputation(Math.max(MIN_REPUTATION, author.getReputation() + repDelta));
                }
            } finally {
                authorLock.unlock();
            }
        } finally {
            postLock.unlock();
        }
    }

    private int scoreDeltaFor(VoteType voteType) {
        if (voteType == null) return 0;
        return voteType == VoteType.UPVOTE ? 1 : -1;
    }

    private int repDeltaFor(ReputationStrategy strategy, VoteType voteType) {
        return voteType == null ? 0 : strategy.deltaForVote(voteType);
    }

    public Question acceptAnswer(String questionId, String answerId, String requesterId) {
        Question q = repository.getQuestion(questionId);
        if (q == null) {
            throw new QuestionNotFoundException("Question not found: " + questionId);
        }

        ReentrantLock questionLock = repository.postLock(questionId);
        questionLock.lock();
        try {
            if (!q.getAuthorId().equals(requesterId)) {
                throw new NotQuestionAuthorException(
                        "Only the question author can accept an answer for " + questionId);
            }
            if (q.getStatus() == QuestionStatus.CLOSED) {
                throw new QuestionClosedException("Question " + questionId + " is closed");
            }

            Answer target = repository.getAnswer(answerId);
            if (target == null || !questionId.equals(target.getQuestionId())) {
                throw new AnswerNotFoundException("Answer " + answerId + " not found on question " + questionId);
            }

            if (!target.isAccepted()) {
                // Unset any previously accepted answer, one answer lock at a time —
                // never held together with the target's lock below.
                for (Answer a : q.getAnswers()) {
                    if (a.isAccepted() && !a.getId().equals(answerId)) {
                        ReentrantLock prevLock = repository.postLock(a.getId());
                        prevLock.lock();
                        try {
                            a.setAccepted(false);
                        } finally {
                            prevLock.unlock();
                        }
                    }
                }

                ReentrantLock targetLock = repository.postLock(answerId);
                targetLock.lock();
                try {
                    target.setAccepted(true);
                } finally {
                    targetLock.unlock();
                }

                ReentrantLock authorLock = repository.userLock(target.getAuthorId());
                authorLock.lock();
                try {
                    User answerAuthor = repository.getUser(target.getAuthorId());
                    if (answerAuthor != null) {
                        answerAuthor.setReputation(answerAuthor.getReputation() + ACCEPTED_ANSWER_BONUS);
                    }
                } finally {
                    authorLock.unlock();
                }
            }
            // else: already the accepted answer — idempotent no-op, no double bonus.

            q.setStatus(QuestionStatus.ANSWERED);
            return q;
        } finally {
            questionLock.unlock();
        }
    }

    public Question closeQuestion(String questionId, String requesterId) {
        Question q = repository.getQuestion(questionId);
        if (q == null) {
            throw new QuestionNotFoundException("Question not found: " + questionId);
        }

        ReentrantLock questionLock = repository.postLock(questionId);
        questionLock.lock();
        try {
            if (!q.getAuthorId().equals(requesterId)) {
                throw new NotQuestionAuthorException("Only the question author can close " + questionId);
            }
            if (q.getStatus() == QuestionStatus.CLOSED) {
                throw new InvalidQuestionTransitionException("Question " + questionId + " is already closed");
            }
            q.setStatus(QuestionStatus.CLOSED);
            return q;
        } finally {
            questionLock.unlock();
        }
    }
}

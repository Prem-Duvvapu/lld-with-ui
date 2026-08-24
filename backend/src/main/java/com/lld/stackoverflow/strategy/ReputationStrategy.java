package com.lld.stackoverflow.strategy;

import com.lld.stackoverflow.model.VoteType;

/**
 * The reputation a post's author gains or loses when one vote is cast on it.
 * Resolved per {@link com.lld.stackoverflow.model.VoteTargetType} by
 * {@link ReputationStrategyFactory} — never selected with an inline switch at
 * the call site.
 *
 * <p>The accepted-answer bonus is deliberately <strong>not</strong> part of this
 * interface: it is a one-time event fired once when an answer is accepted, not a
 * per-vote calculation, so folding it in here (as the module's first draft did)
 * meant every subsequent vote on an already-accepted answer re-applied the bonus.
 * See {@code VotingService#ACCEPTED_ANSWER_BONUS} and RCA.md.
 */
public interface ReputationStrategy {
    int deltaForVote(VoteType voteType);
}

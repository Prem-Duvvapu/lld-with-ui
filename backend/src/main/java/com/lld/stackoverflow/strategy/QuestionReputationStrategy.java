package com.lld.stackoverflow.strategy;

import com.lld.stackoverflow.model.VoteType;

/** Real Stack Overflow numbers: a question upvote is worth less than an answer upvote. */
public class QuestionReputationStrategy implements ReputationStrategy {
    static final int UPVOTE_DELTA = 5;
    static final int DOWNVOTE_DELTA = -2;

    @Override
    public int deltaForVote(VoteType voteType) {
        return switch (voteType) {
            case UPVOTE -> UPVOTE_DELTA;
            case DOWNVOTE -> DOWNVOTE_DELTA;
        };
    }
}

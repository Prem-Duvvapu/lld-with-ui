package com.lld.stackoverflow.strategy;

import com.lld.stackoverflow.model.VoteType;

/** An answer upvote is worth more than a question upvote — answering is the harder work. */
public class AnswerReputationStrategy implements ReputationStrategy {
    static final int UPVOTE_DELTA = 10;
    static final int DOWNVOTE_DELTA = -2;

    @Override
    public int deltaForVote(VoteType voteType) {
        return switch (voteType) {
            case UPVOTE -> UPVOTE_DELTA;
            case DOWNVOTE -> DOWNVOTE_DELTA;
        };
    }
}

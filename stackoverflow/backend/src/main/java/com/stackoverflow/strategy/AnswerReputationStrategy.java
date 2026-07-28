package com.stackoverflow.strategy;

import com.stackoverflow.model.VoteType;

public class AnswerReputationStrategy implements ReputationStrategy {
    @Override
    public int calculateReputationChange(VoteType voteType) {
        return switch (voteType) {
            case UPVOTE -> 15;
            case DOWNVOTE -> -5;
        };
    }
}

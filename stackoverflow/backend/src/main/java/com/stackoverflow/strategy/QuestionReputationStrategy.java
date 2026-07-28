package com.stackoverflow.strategy;

import com.stackoverflow.model.VoteType;

public class QuestionReputationStrategy implements ReputationStrategy {
    @Override
    public int calculateReputationChange(VoteType voteType) {
        return switch (voteType) {
            case UPVOTE -> 10;
            case DOWNVOTE -> -2;
        };
    }
}

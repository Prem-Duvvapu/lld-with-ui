package com.stackoverflow.strategy;

public class AcceptedAnswerReputationStrategy implements ReputationStrategy {
    @Override
    public int calculateReputationChange(com.stackoverflow.model.VoteType voteType) {
        return 25;
    }
}

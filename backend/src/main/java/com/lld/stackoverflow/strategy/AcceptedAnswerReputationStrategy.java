package com.lld.stackoverflow.strategy;

public class AcceptedAnswerReputationStrategy implements ReputationStrategy {
    @Override
    public int calculateReputationChange(com.lld.stackoverflow.model.VoteType voteType) {
        return 25;
    }
}

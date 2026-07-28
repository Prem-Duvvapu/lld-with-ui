package com.stackoverflow.strategy;

import com.stackoverflow.model.VoteType;

public interface ReputationStrategy {
    int calculateReputationChange(VoteType voteType);
}

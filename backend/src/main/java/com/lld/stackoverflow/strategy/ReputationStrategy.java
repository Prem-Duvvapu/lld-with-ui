package com.lld.stackoverflow.strategy;

import com.lld.stackoverflow.model.VoteType;

public interface ReputationStrategy {
    int calculateReputationChange(VoteType voteType);
}

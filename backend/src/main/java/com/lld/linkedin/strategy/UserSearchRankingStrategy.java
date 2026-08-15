package com.lld.linkedin.strategy;

import com.lld.linkedin.model.User;

import java.util.Set;

public interface UserSearchRankingStrategy {
    double calculateUserRelevance(User targetUser, String query, User requestingUser, Set<String> directConnectionIds);
}

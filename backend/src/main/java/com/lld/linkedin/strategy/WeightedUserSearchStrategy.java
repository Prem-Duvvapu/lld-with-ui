package com.lld.linkedin.strategy;

import com.lld.linkedin.model.Skill;
import com.lld.linkedin.model.User;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Component
public class WeightedUserSearchStrategy implements UserSearchRankingStrategy {

    private static final double W_NAME = 0.35;
    private static final double W_HEADLINE = 0.25;
    private static final double W_SKILLS = 0.25;
    private static final double W_NETWORK = 0.15;

    @Override
    public double calculateUserRelevance(User targetUser, String query, User requestingUser, Set<String> directConnectionIds) {
        if (targetUser == null || query == null || query.trim().isEmpty()) {
            return 0.0;
        }

        String normalizedQuery = query.trim().toLowerCase();
        List<String> queryTokens = Arrays.stream(normalizedQuery.split("\\s+"))
                .filter(t -> !t.isEmpty())
                .toList();

        if (queryTokens.isEmpty()) return 0.0;

        // 1. Name Score
        double sName = 0.0;
        String targetName = targetUser.getName().toLowerCase();
        if (targetName.equalsIgnoreCase(normalizedQuery)) {
            sName = 1.0;
        } else if (targetName.contains(normalizedQuery)) {
            sName = 0.8;
        } else {
            long matchedTokens = queryTokens.stream().filter(targetName::contains).count();
            sName = (double) matchedTokens / queryTokens.size();
        }

        // 2. Headline Score
        double sHeadline = 0.0;
        if (targetUser.getProfile() != null && targetUser.getProfile().getHeadline() != null) {
            String headline = targetUser.getProfile().getHeadline().toLowerCase();
            long matchedTokens = queryTokens.stream().filter(headline::contains).count();
            sHeadline = (double) matchedTokens / queryTokens.size();
        }

        // 3. Skills Score
        double sSkills = 0.0;
        if (targetUser.getProfile() != null && !targetUser.getProfile().getSkills().isEmpty()) {
            Set<Skill> skills = targetUser.getProfile().getSkills();
            long matchedSkills = queryTokens.stream()
                    .filter(token -> skills.stream().anyMatch(s -> s.getName().contains(token)))
                    .count();
            sSkills = (double) matchedSkills / queryTokens.size();
        }

        // 4. Network Score
        double sNetwork = 0.1; // default out-of-network
        if (requestingUser != null && directConnectionIds != null) {
            if (directConnectionIds.contains(targetUser.getId())) {
                sNetwork = 1.0; // 1st degree
            }
        }

        return (W_NAME * sName) + (W_HEADLINE * sHeadline) + (W_SKILLS * sSkills) + (W_NETWORK * sNetwork);
    }
}

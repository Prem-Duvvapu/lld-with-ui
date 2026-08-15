package com.lld.linkedin.strategy;

import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.Skill;
import com.lld.linkedin.model.User;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Component
public class WeightedJobSearchStrategy implements JobSearchRankingStrategy {

    private static final double W_TITLE = 0.35;
    private static final double W_SKILL = 0.35;
    private static final double W_LOCATION = 0.20;
    private static final double W_RECENCY = 0.10;

    @Override
    public double calculateJobRelevance(JobPosting job, String queryKeywords, String location, User applicant) {
        if (job == null) return 0.0;

        // 1. Title Match Score
        double sTitle = 0.5;
        if (queryKeywords != null && !queryKeywords.trim().isEmpty()) {
            String normalizedQuery = queryKeywords.trim().toLowerCase();
            List<String> tokens = Arrays.stream(normalizedQuery.split("\\s+"))
                    .filter(t -> !t.isEmpty())
                    .toList();
            String title = job.getTitle().toLowerCase();
            if (title.contains(normalizedQuery)) {
                sTitle = 1.0;
            } else if (!tokens.isEmpty()) {
                long matched = tokens.stream().filter(title::contains).count();
                sTitle = (double) matched / tokens.size();
            }
        }

        // 2. Skill Overlap Score
        double sSkill = 0.5;
        Set<String> requiredSkills = job.getRequiredSkills();
        if (applicant != null && applicant.getProfile() != null && !requiredSkills.isEmpty()) {
            Set<Skill> userSkills = applicant.getProfile().getSkills();
            long matchedSkills = userSkills.stream()
                    .filter(us -> requiredSkills.contains(us.getName()))
                    .count();
            sSkill = (double) matchedSkills / requiredSkills.size();
        }

        // 3. Location Match Score
        double sLocation = 0.5;
        if (location != null && !location.trim().isEmpty()) {
            String normLoc = location.trim().toLowerCase();
            if (job.getLocation().toLowerCase().contains(normLoc) || "remote".equalsIgnoreCase(job.getLocation())) {
                sLocation = 1.0;
            } else {
                sLocation = 0.0;
            }
        }

        // 4. Recency Score (Linear decay over 30 days)
        double sRecency = 1.0;
        if (job.getPostedAt() != null) {
            long days = Duration.between(job.getPostedAt(), Instant.now()).toDays();
            sRecency = Math.max(0.0, 1.0 - ((double) days / 30.0));
        }

        return (W_TITLE * sTitle) + (W_SKILL * sSkill) + (W_LOCATION * sLocation) + (W_RECENCY * sRecency);
    }
}

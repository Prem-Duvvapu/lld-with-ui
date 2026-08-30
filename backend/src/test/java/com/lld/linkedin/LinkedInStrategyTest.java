package com.lld.linkedin;

import com.lld.linkedin.enums.EmploymentType;
import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.Skill;
import com.lld.linkedin.model.User;
import com.lld.linkedin.strategy.WeightedJobSearchStrategy;
import com.lld.linkedin.strategy.WeightedUserSearchStrategy;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Strategy-flavour tests pinning {@link WeightedUserSearchStrategy} and
 * {@link WeightedJobSearchStrategy}'s relevance math in isolation from
 * {@code LinkedInService}'s connection/repository lookups.
 */
public class LinkedInStrategyTest {

    private final WeightedUserSearchStrategy userStrategy = new WeightedUserSearchStrategy();
    private final WeightedJobSearchStrategy jobStrategy = new WeightedJobSearchStrategy();

    private User user(String name) {
        return new User("u-" + name.hashCode(), name, name.toLowerCase().replace(" ", "") + "@example.com", "hash");
    }

    // ---- WeightedUserSearchStrategy ------------------------------------------

    @Test
    public void blankOrNullQueryScoresZero() {
        User target = user("Alice");
        assertEquals(0.0, userStrategy.calculateUserRelevance(target, null, null, Set.of()));
        assertEquals(0.0, userStrategy.calculateUserRelevance(target, "   ", null, Set.of()));
        assertEquals(0.0, userStrategy.calculateUserRelevance(null, "alice", null, Set.of()));
    }

    @Test
    public void exactNameMatchOutOfNetworkScoresNameWeightPlusDefaultNetworkFloor() {
        User target = user("Alice");
        // sName=1.0 (exact match), sHeadline=0 (blank default headline), sSkills=0 (no skills),
        // sNetwork=0.1 (default "out of network" floor — no requester supplied).
        double expected = 0.35 * 1.0 + 0.15 * 0.1;
        assertEquals(expected, userStrategy.calculateUserRelevance(target, "Alice", null, Set.of()), 0.0001);
    }

    @Test
    public void partialNameContainmentScoresLowerThanExactMatch() {
        User target = user("Alice Vance");
        double partial = userStrategy.calculateUserRelevance(target, "Alice", null, Set.of());
        double exact = userStrategy.calculateUserRelevance(target, "Alice Vance", null, Set.of());
        assertTrue(partial < exact, "a substring match must score lower than the exact full-name match");
    }

    @Test
    public void firstDegreeConnectionScoresHigherThanOutOfNetworkOtherwiseIdentical() {
        User requester = user("Requester");
        User target = user("Bob");

        double outOfNetwork = userStrategy.calculateUserRelevance(target, "Bob", requester, Set.of());
        double firstDegree = userStrategy.calculateUserRelevance(target, "Bob", requester, Set.of(target.getId()));

        assertTrue(firstDegree > outOfNetwork, "a direct connection must score higher than an out-of-network match");
        assertEquals(0.15 * (1.0 - 0.1), firstDegree - outOfNetwork, 0.0001, "the entire gap must be exactly the network weight's swing from 0.1 to 1.0");
    }

    @Test
    public void matchingSkillsAndHeadlineContributeToTheScore() {
        User target = user("Carol");
        target.getProfile().setHeadline("Senior Java Architect");
        target.getProfile().addSkill(new Skill("Java"));

        double withoutMatch = userStrategy.calculateUserRelevance(user("Dave"), "java", null, Set.of());
        double withMatch = userStrategy.calculateUserRelevance(target, "java", null, Set.of());

        assertTrue(withMatch > withoutMatch, "a headline+skill match on the query token must outscore a user with neither");
    }

    // ---- WeightedJobSearchStrategy --------------------------------------------

    private JobPosting job(String title, String location, Set<String> skills) {
        return new JobPosting(null, "poster-1", title, "Acme", location, "desc", EmploymentType.FULL_TIME, skills);
    }

    @Test
    public void nullJobScoresZero() {
        assertEquals(0.0, jobStrategy.calculateJobRelevance(null, "java", null, null));
    }

    @Test
    public void noQueryNoLocationNoApplicantUsesTheNeutralDefaultsForEachFactor() {
        JobPosting posting = job("Backend Engineer", "Remote", Set.of("java"));
        // sTitle=0.5 (no query), sSkill=0.5 (no applicant), sLocation=0.5 (no requested location),
        // sRecency≈1.0 (posted seconds ago).
        double expected = 0.35 * 0.5 + 0.35 * 0.5 + 0.20 * 0.5 + 0.10 * 1.0;
        assertEquals(expected, jobStrategy.calculateJobRelevance(posting, null, null, null), 0.001);
    }

    @Test
    public void titleContainingTheFullQueryScoresTheMaximumTitleWeight() {
        JobPosting posting = job("Senior Backend Engineer", "Remote", null);
        double withMatch = jobStrategy.calculateJobRelevance(posting, "backend engineer", null, null);
        double withoutMatch = jobStrategy.calculateJobRelevance(posting, "frontend designer", null, null);
        assertTrue(withMatch > withoutMatch, "a query fully contained in the title must outscore one with no token match");
    }

    @Test
    public void remoteJobsMatchAnyRequestedLocation() {
        JobPosting remoteJob = job("Engineer", "Remote", null);
        JobPosting onsiteJob = job("Engineer", "New York, NY", null);

        // A "Remote" job matches regardless of what location the searcher asked for.
        double remoteScore = jobStrategy.calculateJobRelevance(remoteJob, null, "San Francisco", null);
        double onsiteScoreWrongCity = jobStrategy.calculateJobRelevance(onsiteJob, null, "San Francisco", null);
        double onsiteScoreRightCity = jobStrategy.calculateJobRelevance(onsiteJob, null, "New York", null);

        assertTrue(remoteScore > onsiteScoreWrongCity, "Remote must score the location factor as a match even for an unrelated requested city");
        assertTrue(onsiteScoreRightCity > onsiteScoreWrongCity, "an onsite job must only match a requested location it actually contains");
    }

    @Test
    public void applicantSkillOverlapIncreasesTheScoreProportionally() {
        JobPosting posting = job("Engineer", "Remote", Set.of("java", "kubernetes"));
        User noSkillApplicant = user("NoSkills");
        User fullMatchApplicant = user("FullMatch");
        fullMatchApplicant.getProfile().addSkill(new Skill("java"));
        fullMatchApplicant.getProfile().addSkill(new Skill("kubernetes"));

        double noMatchScore = jobStrategy.calculateJobRelevance(posting, null, null, noSkillApplicant);
        double fullMatchScore = jobStrategy.calculateJobRelevance(posting, null, null, fullMatchApplicant);

        assertTrue(fullMatchScore > noMatchScore, "an applicant matching every required skill must score higher than one matching none");
    }
}

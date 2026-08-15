package com.lld.linkedin.strategy;

import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.User;

public interface JobSearchRankingStrategy {
    double calculateJobRelevance(JobPosting job, String queryKeywords, String location, User applicant);
}

package com.lld.linkedin.model;

import com.lld.linkedin.enums.EmploymentType;
import com.lld.linkedin.enums.JobStatus;

import java.time.Instant;
import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class JobPosting {
    private final String id;
    private final String posterId;
    private String title;
    private String company;
    private String location;
    private String description;
    private EmploymentType employmentType;
    private final Set<String> requiredSkills = ConcurrentHashMap.newKeySet();
    private volatile JobStatus status;
    private final Set<String> applicantUserIds = ConcurrentHashMap.newKeySet();
    private final Instant postedAt;

    public JobPosting(String id, String posterId, String title, String company, String location, String description, EmploymentType employmentType, Set<String> skills) {
        if (posterId == null || posterId.trim().isEmpty()) {
            throw new IllegalArgumentException("Poster ID cannot be null or empty");
        }
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be null or empty");
        }
        if (company == null || company.trim().isEmpty()) {
            throw new IllegalArgumentException("Company cannot be null or empty");
        }
        this.id = id != null ? id : UUID.randomUUID().toString();
        this.posterId = posterId;
        this.title = title.trim();
        this.company = company.trim();
        this.location = location != null ? location.trim() : "Remote";
        this.description = description != null ? description.trim() : "";
        this.employmentType = employmentType != null ? employmentType : EmploymentType.FULL_TIME;
        this.status = JobStatus.OPEN;
        this.postedAt = Instant.now();
        if (skills != null) {
            skills.forEach(s -> this.requiredSkills.add(s.trim().toLowerCase()));
        }
    }

    public String getId() {
        return id;
    }

    public String getPosterId() {
        return posterId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EmploymentType getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(EmploymentType employmentType) {
        this.employmentType = employmentType;
    }

    public Set<String> getRequiredSkills() {
        return Collections.unmodifiableSet(requiredSkills);
    }

    public void addRequiredSkill(String skillName) {
        if (skillName != null && !skillName.trim().isEmpty()) {
            requiredSkills.add(skillName.trim().toLowerCase());
        }
    }

    public JobStatus getStatus() {
        return status;
    }

    public void setStatus(JobStatus status) {
        this.status = status;
    }

    public boolean addApplicant(String userId) {
        if (userId == null) return false;
        return applicantUserIds.add(userId);
    }

    public boolean hasApplied(String userId) {
        return userId != null && applicantUserIds.contains(userId);
    }

    public Set<String> getApplicants() {
        return Collections.unmodifiableSet(applicantUserIds);
    }

    public Instant getPostedAt() {
        return postedAt;
    }
}

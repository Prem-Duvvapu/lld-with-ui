package com.lld.linkedin.model;

import lombok.Getter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@Getter
public class Profile {
    private final String profileId;
    private final String userId;
    private String headline;
    private String summary;
    private String location;
    private final List<Experience> experiences = new CopyOnWriteArrayList<>();
    private final List<Education> educations = new CopyOnWriteArrayList<>();
    private final Set<Skill> skills = ConcurrentHashMap.newKeySet();
    private final AtomicLong profileViews = new AtomicLong(0);

    public Profile(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }
        this.profileId = UUID.randomUUID().toString();
        this.userId = userId;
        this.headline = "";
        this.summary = "";
        this.location = "";
    }

    public void setHeadline(String headline) {
        this.headline = headline != null ? headline.trim() : "";
    }

    public void setSummary(String summary) {
        this.summary = summary != null ? summary.trim() : "";
    }

    public void setLocation(String location) {
        this.location = location != null ? location.trim() : "";
    }

    public List<Experience> getExperiences() {
        return Collections.unmodifiableList(experiences);
    }

    public void addExperience(Experience experience) {
        if (experience != null) {
            experiences.add(experience);
        }
    }

    public boolean removeExperience(String experienceId) {
        return experiences.removeIf(e -> e.getId().equals(experienceId));
    }

    public List<Education> getEducations() {
        return Collections.unmodifiableList(educations);
    }

    public void addEducation(Education education) {
        if (education != null) {
            educations.add(education);
        }
    }

    public boolean removeEducation(String educationId) {
        return educations.removeIf(e -> e.getId().equals(educationId));
    }

    public Set<Skill> getSkills() {
        return Collections.unmodifiableSet(skills);
    }

    public void addSkill(Skill skill) {
        if (skill != null) {
            skills.add(skill);
        }
    }

    public boolean removeSkill(String skillName) {
        if (skillName == null) return false;
        String normalized = skillName.trim().toLowerCase();
        return skills.removeIf(s -> s.getName().equalsIgnoreCase(normalized));
    }

    public long incrementProfileViews() {
        return profileViews.incrementAndGet();
    }

    public long getProfileViews() {
        return profileViews.get();
    }
}

package com.lld.linkedin.model;

import java.time.LocalDate;
import java.util.UUID;

public class Education {
    private final String id;
    private String school;
    private String degree;
    private String fieldOfStudy;
    private LocalDate startDate;
    private LocalDate endDate;

    public Education(String school, String degree, String fieldOfStudy, LocalDate startDate, LocalDate endDate) {
        if (school == null || school.trim().isEmpty()) {
            throw new IllegalArgumentException("School cannot be null or empty");
        }
        if (degree == null || degree.trim().isEmpty()) {
            throw new IllegalArgumentException("Degree cannot be null or empty");
        }
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Start and End dates cannot be null");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
        this.id = UUID.randomUUID().toString();
        this.school = school.trim();
        this.degree = degree.trim();
        this.fieldOfStudy = fieldOfStudy != null ? fieldOfStudy.trim() : "";
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public String getId() {
        return id;
    }

    public String getSchool() {
        return school;
    }

    public void setSchool(String school) {
        this.school = school;
    }

    public String getDegree() {
        return degree;
    }

    public void setDegree(String degree) {
        this.degree = degree;
    }

    public String getFieldOfStudy() {
        return fieldOfStudy;
    }

    public void setFieldOfStudy(String fieldOfStudy) {
        this.fieldOfStudy = fieldOfStudy;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
}

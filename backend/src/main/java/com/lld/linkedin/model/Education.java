package com.lld.linkedin.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
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
}

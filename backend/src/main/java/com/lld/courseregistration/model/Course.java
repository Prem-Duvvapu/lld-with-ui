package com.lld.courseregistration.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Catalog entry. Prerequisites are stored as course codes rather than embedded {@code Course}
 * objects to avoid a self-referential object graph — {@link com.lld.courseregistration.service.CourseRegistrationService}
 * resolves them against the repository when checking eligibility.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {
    private String id;
    private String code;
    private String title;
    private String description;
    private int credits;
    private String department;
    @Builder.Default
    private List<String> prerequisiteCourseCodes = new ArrayList<>();
}

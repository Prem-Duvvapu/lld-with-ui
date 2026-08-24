package com.lld.courseregistration.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    private String id;
    private String name;
    private String email;
    private String department;
    /** Course codes the student has already passed — the prerequisite check reads this set. */
    @Builder.Default
    private Set<String> completedCourseCodes = new HashSet<>();
}

package com.lld.courseregistration.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Links a student to a section for one term. {@code status} is only ever mutated by
 * {@link com.lld.courseregistration.service.CourseRegistrationService} while holding the
 * section's capacity lock (see {@link com.lld.courseregistration.service.SectionCapacityManager}),
 * so ENROLLED-vs-WAITLISTED is always consistent with the section's own counters.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Registration {
    private String id;
    private String studentId;
    private String courseId;
    private String sectionId;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;
    private LocalDateTime droppedAt;
    /** 1-based position in the waitlist at the moment of registration; null once ENROLLED. */
    private Integer waitlistPosition;
}

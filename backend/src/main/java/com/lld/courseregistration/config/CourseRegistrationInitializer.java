package com.lld.courseregistration.config;

import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.Student;
import com.lld.courseregistration.model.TimeSlot;
import com.lld.courseregistration.repository.CourseRegistrationRepository;
import com.lld.courseregistration.service.CourseRegistrationService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds a realistic catalog: a prerequisite chain (CS101 -> CS201 -> CS301 -> CS401,
 * MATH101 -> MATH201), a section deliberately capacity-limited to 2 so the demo starts with a
 * live waitlist entry already in place, and a schedule-conflict pair (CS201-A / MATH201-A
 * overlap on Monday/Wednesday) that a fresh registration attempt can trip live in the UI.
 */
@Component
public class CourseRegistrationInitializer {

    private final CourseRegistrationRepository repository;
    private final CourseRegistrationService service;

    public CourseRegistrationInitializer(CourseRegistrationRepository repository, CourseRegistrationService service) {
        this.repository = repository;
        this.service = service;
    }

    @PostConstruct
    public void init() {
        Course cs101 = course("CS101", "CS101", "Intro to Programming", "Variables, control flow, functions.", 4, "CS", List.of());
        Course cs201 = course("CS201", "CS201", "Data Structures", "Lists, trees, hash maps, complexity.", 4, "CS", List.of("CS101"));
        Course cs301 = course("CS301", "CS301", "Algorithms", "Graph algorithms, DP, greedy.", 4, "CS", List.of("CS201"));
        Course cs401 = course("CS401", "CS401", "Distributed Systems", "Consensus, replication, partitioning.", 4, "CS", List.of("CS301"));
        Course math101 = course("MATH101", "MATH101", "Calculus I", "Limits, derivatives, integrals.", 3, "MATH", List.of());
        Course math201 = course("MATH201", "MATH201", "Calculus II", "Series, multivariable calculus.", 3, "MATH", List.of("MATH101"));

        Section cs101A = section("CS101-A", cs101.getId(), "A", "Dr. Turing", 30,
                days(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY), LocalTime.of(9, 0), LocalTime.of(10, 0), "Hall 1", "FALL-2026");
        // Deliberately small capacity — one confirmed seat away from full, so a fresh registration
        // during the demo waitlists immediately without needing to fill it first.
        Section cs201A = section("CS201-A", cs201.getId(), "A", "Dr. Lovelace", 2,
                days(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), LocalTime.of(10, 0), LocalTime.of(11, 0), "Hall 2", "FALL-2026");
        Section cs301A = section("CS301-A", cs301.getId(), "A", "Dr. Knuth", 25,
                days(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), LocalTime.of(13, 0), LocalTime.of(14, 30), "Hall 3", "FALL-2026");
        Section cs401A = section("CS401-A", cs401.getId(), "A", "Dr. Lamport", 15,
                days(DayOfWeek.FRIDAY), LocalTime.of(9, 0), LocalTime.of(11, 0), "Hall 4", "FALL-2026");
        Section math101A = section("MATH101-A", math101.getId(), "A", "Dr. Newton", 30,
                days(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY), LocalTime.of(11, 0), LocalTime.of(12, 0), "Hall 5", "FALL-2026");
        // Overlaps CS201-A (Mon/Wed 10:00-11:00) on purpose: 10:30 < 11:00 and 10:00 < 11:30.
        Section math201A = section("MATH201-A", math201.getId(), "A", "Dr. Leibniz", 20,
                days(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), LocalTime.of(10, 30), LocalTime.of(11, 30), "Hall 6", "FALL-2026");

        Student alice = student("STU-001", "Alice Johnson", "alice@campus.edu", "CS", "CS101", "MATH101");
        Student bob = student("STU-002", "Bob Martinez", "bob@campus.edu", "CS", "CS101", "MATH101");
        Student charlie = student("STU-003", "Charlie Nguyen", "charlie@campus.edu", "CS", "CS101");
        Student diana = student("STU-004", "Diana Osei", "diana@campus.edu", "CS", "CS101", "CS201", "MATH101", "MATH201");
        Student erin = student("STU-005", "Erin Patel", "erin@campus.edu", "CS", "CS101", "CS201", "CS301", "MATH101");

        // Fill CS201-A to capacity (2/2), then waitlist a third — the demo starts with a live
        // waitlist entry ready to be promoted the moment someone drops.
        service.register(alice.getId(), cs201A.getId());
        service.register(bob.getId(), cs201A.getId());
        service.register(charlie.getId(), cs201A.getId()); // WAITLISTED — section full

        service.register(diana.getId(), cs301A.getId());
        service.register(erin.getId(), cs401A.getId());
        service.register(alice.getId(), cs101A.getId()); // disjoint days from CS201-A — no conflict
    }

    private Course course(String id, String code, String title, String description, int credits, String department, List<String> prereqs) {
        return repository.saveCourse(Course.builder()
                .id(id).code(code).title(title).description(description)
                .credits(credits).department(department).prerequisiteCourseCodes(prereqs)
                .build());
    }

    private Section section(String id, String courseId, String code, String professor, int capacity,
                             Set<DayOfWeek> days, LocalTime start, LocalTime end, String room, String semester) {
        return repository.saveSection(Section.builder()
                .id(id).courseId(courseId).sectionCode(code).professorName(professor)
                .capacity(capacity).enrolledCount(0)
                .timeSlot(TimeSlot.builder().days(days).startTime(start).endTime(end).room(room).build())
                .semester(semester)
                .build());
    }

    private Student student(String id, String name, String email, String department, String... completed) {
        return repository.saveStudent(Student.builder()
                .id(id).name(name).email(email).department(department)
                .completedCourseCodes(new HashSet<>(List.of(completed)))
                .build());
    }

    private Set<DayOfWeek> days(DayOfWeek... d) {
        return EnumSet.copyOf(List.of(d));
    }
}

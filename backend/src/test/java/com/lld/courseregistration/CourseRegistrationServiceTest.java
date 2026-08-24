package com.lld.courseregistration;

import com.lld.courseregistration.exception.AlreadyRegisteredException;
import com.lld.courseregistration.exception.CourseNotFoundException;
import com.lld.courseregistration.exception.InvalidDropException;
import com.lld.courseregistration.exception.PrerequisiteNotMetException;
import com.lld.courseregistration.exception.RegistrationNotFoundException;
import com.lld.courseregistration.exception.ScheduleConflictException;
import com.lld.courseregistration.exception.SectionNotFoundException;
import com.lld.courseregistration.exception.StudentNotFoundException;
import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.RegistrationStatus;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.Student;
import com.lld.courseregistration.model.TimeSlot;
import com.lld.courseregistration.repository.CourseRegistrationRepository;
import com.lld.courseregistration.service.CourseRegistrationService;
import com.lld.courseregistration.service.SectionCapacityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Course Registration Service — Workflow, Prerequisites, Schedule Conflicts, Waitlist")
class CourseRegistrationServiceTest {

    private CourseRegistrationRepository repository;
    private CourseRegistrationService service;

    @BeforeEach
    void setUp() {
        repository = new CourseRegistrationRepository();
        SectionCapacityManager capacityManager = new SectionCapacityManager(repository);
        service = new CourseRegistrationService(repository, capacityManager);
        // The service constructor seeds its own isolated sim world; the live repository we
        // handed it is otherwise empty, so every test below builds exactly the fixture it needs.
    }

    private Course givenCourse(String id, List<String> prereqCodes) {
        Course course = Course.builder().id(id).code(id).title(id + " Title").description("desc")
                .credits(3).department("CS").prerequisiteCourseCodes(prereqCodes).build();
        repository.saveCourse(course);
        return course;
    }

    private Section givenSection(String id, String courseId, int capacity, DayOfWeek day, int startHour, int endHour) {
        Section section = Section.builder().id(id).courseId(courseId).sectionCode("A")
                .professorName("Dr. Test").capacity(capacity).enrolledCount(0)
                .timeSlot(TimeSlot.builder().days(EnumSet.of(day))
                        .startTime(LocalTime.of(startHour, 0)).endTime(LocalTime.of(endHour, 0)).room("R1").build())
                .semester("TERM").build();
        repository.saveSection(section);
        return section;
    }

    private Student givenStudent(String id, String... completed) {
        Student student = Student.builder().id(id).name(id).email(id + "@test.com")
                .department("CS").completedCourseCodes(new HashSet<>(List.of(completed))).build();
        repository.saveStudent(student);
        return student;
    }

    // ---------- happy path ----------

    @Test
    @DisplayName("Registering into a section with an open seat enrolls immediately")
    void registerWithOpenSeatEnrolls() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 5, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");

        Registration reg = service.register("S1", "SEC-1");

        assertEquals(RegistrationStatus.ENROLLED, reg.getStatus());
        assertNull(reg.getWaitlistPosition());
        assertEquals(1, repository.getSection("SEC-1").getEnrolledCount());
    }

    @Test
    @DisplayName("Registering into a full section waitlists instead of rejecting outright")
    void registerWhenFullWaitlists() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 1, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");
        givenStudent("S2");

        service.register("S1", "SEC-1"); // fills the only seat
        Registration reg = service.register("S2", "SEC-1");

        assertEquals(RegistrationStatus.WAITLISTED, reg.getStatus());
        assertEquals(1, reg.getWaitlistPosition());
        assertEquals(1, repository.getSection("SEC-1").getEnrolledCount(), "capacity must not be exceeded");
    }

    // ---------- 404s ----------

    @Test
    void registerUnknownStudentThrows() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 5, DayOfWeek.MONDAY, 9, 10);
        assertThrows(StudentNotFoundException.class, () -> service.register("GHOST", "SEC-1"));
    }

    @Test
    void registerUnknownSectionThrows() {
        givenStudent("S1");
        assertThrows(SectionNotFoundException.class, () -> service.register("S1", "GHOST"));
    }

    @Test
    void getUnknownCourseThrows() {
        assertThrows(CourseNotFoundException.class, () -> service.getCourse("GHOST"));
    }

    // ---------- prerequisites ----------

    @Test
    @DisplayName("Registering without a completed prerequisite is rejected")
    void registerMissingPrerequisiteThrows() {
        givenCourse("CS101", List.of());
        givenCourse("CS201", List.of("CS101"));
        givenSection("SEC-201", "CS201", 5, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1"); // has not completed CS101

        assertThrows(PrerequisiteNotMetException.class, () -> service.register("S1", "SEC-201"));
        assertTrue(repository.getRegistrationsByStudent("S1").isEmpty(), "a rejected registration must not be persisted");
    }

    @Test
    @DisplayName("Registering with the prerequisite completed succeeds")
    void registerWithPrerequisiteMetSucceeds() {
        givenCourse("CS101", List.of());
        givenCourse("CS201", List.of("CS101"));
        givenSection("SEC-201", "CS201", 5, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1", "CS101");

        Registration reg = service.register("S1", "SEC-201");
        assertEquals(RegistrationStatus.ENROLLED, reg.getStatus());
    }

    // ---------- schedule conflicts ----------

    @Test
    @DisplayName("Registering into an overlapping time slot while already enrolled elsewhere is rejected")
    void registerOverlappingScheduleThrows() {
        givenCourse("CS101", List.of());
        givenCourse("MATH101", List.of());
        givenSection("SEC-CS", "CS101", 5, DayOfWeek.MONDAY, 9, 10);
        givenSection("SEC-MATH", "MATH101", 5, DayOfWeek.MONDAY, 9, 11); // 9-11 overlaps 9-10
        givenStudent("S1");

        service.register("S1", "SEC-CS");
        assertThrows(ScheduleConflictException.class, () -> service.register("S1", "SEC-MATH"));
    }

    @Test
    @DisplayName("Registering into a disjoint time slot while already enrolled elsewhere succeeds")
    void registerDisjointScheduleSucceeds() {
        givenCourse("CS101", List.of());
        givenCourse("MATH101", List.of());
        givenSection("SEC-CS", "CS101", 5, DayOfWeek.MONDAY, 9, 10);
        givenSection("SEC-MATH", "MATH101", 5, DayOfWeek.TUESDAY, 9, 10); // different day
        givenStudent("S1");

        service.register("S1", "SEC-CS");
        Registration reg = service.register("S1", "SEC-MATH");
        assertEquals(RegistrationStatus.ENROLLED, reg.getStatus());
    }

    // ---------- duplicate registration ----------

    @Test
    @DisplayName("Registering twice for the same section is rejected")
    void duplicateRegistrationThrows() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 5, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");

        service.register("S1", "SEC-1");
        assertThrows(AlreadyRegisteredException.class, () -> service.register("S1", "SEC-1"));
    }

    // ---------- drop + promotion ----------

    @Test
    @DisplayName("Dropping an ENROLLED registration frees the seat and promotes the FIFO-head waitlisted student")
    void dropPromotesNextWaitlistedStudent() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 1, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");
        givenStudent("S2");

        Registration first = service.register("S1", "SEC-1");   // ENROLLED
        Registration second = service.register("S2", "SEC-1");  // WAITLISTED

        CourseRegistrationService.DropOutcome outcome = service.drop(first.getId());

        assertEquals(RegistrationStatus.DROPPED, outcome.dropped.getStatus());
        assertNotNull(outcome.promoted, "the waitlisted student must be promoted");
        assertEquals("S2", outcome.promoted.getStudentId());
        assertEquals(RegistrationStatus.ENROLLED, outcome.promoted.getStatus());
        assertEquals(1, repository.getSection("SEC-1").getEnrolledCount(), "the freed seat is refilled, not left empty");

        Registration reloaded = repository.getRegistration(second.getId());
        assertEquals(RegistrationStatus.ENROLLED, reloaded.getStatus());
    }

    @Test
    @DisplayName("Dropping when nobody is waitlisted simply frees the seat")
    void dropWithoutWaitlistFreesSeat() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 3, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");

        Registration reg = service.register("S1", "SEC-1");
        CourseRegistrationService.DropOutcome outcome = service.drop(reg.getId());

        assertNull(outcome.promoted);
        assertEquals(0, repository.getSection("SEC-1").getEnrolledCount());
    }

    @Test
    @DisplayName("Dropping a WAITLISTED registration removes it from the queue without freeing a seat")
    void dropWaitlistedRegistrationRemovesFromQueue() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 1, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");
        givenStudent("S2");

        service.register("S1", "SEC-1");
        Registration waitlisted = service.register("S2", "SEC-1");

        CourseRegistrationService.DropOutcome outcome = service.drop(waitlisted.getId());

        assertNull(outcome.promoted);
        assertEquals(1, repository.getSection("SEC-1").getEnrolledCount(), "S1's confirmed seat is untouched");
        assertTrue(repository.getSection("SEC-1").getWaitlist().isEmpty());
    }

    @Test
    @DisplayName("Dropping an already-dropped registration is rejected")
    void dropAlreadyDroppedThrows() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 3, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");

        Registration reg = service.register("S1", "SEC-1");
        service.drop(reg.getId());

        assertThrows(InvalidDropException.class, () -> service.drop(reg.getId()));
    }

    @Test
    void dropUnknownRegistrationThrows() {
        assertThrows(RegistrationNotFoundException.class, () -> service.drop("GHOST"));
    }

    // ---------- after dropping, re-registering is allowed ----------

    @Test
    @DisplayName("After dropping, the student may register again (the AlreadyRegistered guard only covers active registrations)")
    void reRegisterAfterDropSucceeds() {
        givenCourse("CS101", List.of());
        givenSection("SEC-1", "CS101", 3, DayOfWeek.MONDAY, 9, 10);
        givenStudent("S1");

        Registration first = service.register("S1", "SEC-1");
        service.drop(first.getId());

        Registration second = service.register("S1", "SEC-1");
        assertEquals(RegistrationStatus.ENROLLED, second.getStatus());
        assertNotEquals(first.getId(), second.getId());
    }
}
